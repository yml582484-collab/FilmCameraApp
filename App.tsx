import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Video, ResizeMode } from 'expo-av';
import {
  FilmFilterPreset,
  FILM_PRESETS,
  getFilterPreviewConfig,
  getCategories,
  getFiltersByCategory,
  getFilterColor,
  createFilterProcessorHTML,
  buildFilterParams,
} from './src/filters/FilmFilterEngine';

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');

export default function App() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [activeFilter, setActiveFilter] = useState<FilmFilterPreset>(FILM_PRESETS[0]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [galleryPreviewUri, setGalleryPreviewUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<{ uri: string; id: string }[]>([]);
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [mode, setMode] = useState<'picture' | 'video'>('picture');
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const webViewRef = useRef<WebView>(null);
  const pendingRequests = useRef<Map<string, { resolve: (v: string) => void; reject: (e: Error) => void }>>(new Map());

  // ---- WebView 消息处理 ----
  const onWebViewMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ready') {
        console.log('Filter processor ready');
        return;
      }
      const pending = pendingRequests.current.get(msg.id);
      if (!pending) return;
      pendingRequests.current.delete(msg.id);
      if (msg.type === 'result' && msg.data) {
        const base64 = msg.data.replace(/^data:image\/jpeg;base64,/, '');
        pending.resolve(base64);
      } else {
        pending.reject(new Error(msg.error || 'Unknown error'));
      }
    } catch (e) {
      // ignore parse errors
    }
  }, []);

  // ---- 通过 WebView Canvas 处理图片 ----
  const processImage = useCallback(
    (imageUri: string, preset: FilmFilterPreset): Promise<string> =>
      new Promise(async (resolve, reject) => {
        try {
          if (!webViewRef.current) {
            resolve(imageUri); // WebView 未就绪，返回原图
            return;
          }
          const base64 = await FileSystem.readAsStringAsync(imageUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          pendingRequests.current.set(id, { resolve, reject });

          const msg = JSON.stringify({
            id,
            type: 'process',
            imageData: `data:image/jpeg;base64,${base64}`,
            params: buildFilterParams(preset),
          });

          webViewRef.current.postMessage(msg);

          // 30 秒超时
          setTimeout(() => {
            if (pendingRequests.current.has(id)) {
              pendingRequests.current.delete(id);
              reject(new Error('Processing timeout'));
            }
          }, 30000);
        } catch (error) {
          reject(error);
        }
      }),
    [],
  );

  const handleRecord = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: 60,
      });
      if (video && 'uri' in video && video.uri) {
        setRecordedVideo(video.uri);
      }
    } catch (error) {
      console.warn('录制失败:', error);
    } finally {
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  }, []);

  const categories = getCategories();
  const filteredPresets = getFiltersByCategory(activeCategory);

  // 权限请求
  const requestPermissions = useCallback(async () => {
    if (!cameraPermission?.granted) await requestCameraPermission();
    if (!mediaPermission?.granted) await requestMediaPermission();
  }, [cameraPermission, mediaPermission]);

  // 切换网格显示
  const toggleGrid = useCallback(() => {
    setShowGrid((prev) => !prev);
  }, []);

  // 切换闪光灯
  const toggleFlash = useCallback(() => {
    setFlashMode((prev) => (prev === 'off' ? 'on' : 'off'));
  }, []);

  // 点击聚焦
  const handleFocus = useCallback((x: number, y: number) => {
    setFocusPoint({ x, y });

    setTimeout(() => {
      setFocusPoint(null);
    }, 1500);
  }, []);

  // 切换前后摄像头
  const toggleCameraFacing = useCallback(() => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }, []);

  // 拍照
  const takePicture = useCallback(async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        skipProcessing: false,
      });
      if (photo?.uri) {
        const resultBase64 = await processImage(photo.uri, activeFilter);
        const fileUri = `${FileSystem.cacheDirectory}filtered_${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(fileUri, resultBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        setCapturedPhoto(fileUri);
      }
    } catch (error) {
      Alert.alert('拍照失败', '请重试');
    } finally {
      setIsCapturing(false);
    }
  }, [activeFilter, isCapturing, processImage]);

  // 保存照片
  const savePhoto = useCallback(async () => {
    if (!capturedPhoto) return;
    try {
      await MediaLibrary.saveToLibraryAsync(capturedPhoto);
      Alert.alert('保存成功', '照片已保存到相册');
      setCapturedPhoto(null);
    } catch (error) {
      Alert.alert('保存失败', '请检查相册权限');
    }
  }, [capturedPhoto]);

  // 重拍
  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
  }, []);

  // 开始/停止录制
  const toggleRecording = useCallback(async () => {
    if (!cameraRef.current) return;

    if (isRecordingRef.current) {
      try {
        await cameraRef.current.stopRecording();
      } catch (e) {
        console.warn('停止录制失败:', e);
        isRecordingRef.current = false;
        setIsRecording(false);
      }
    } else {
      isRecordingRef.current = true;
      setIsRecording(true);
      handleRecord();
    }
  }, [handleRecord]);

  // 保存视频
  const saveVideo = useCallback(async () => {
    if (!recordedVideo) return;
    try {
      await MediaLibrary.saveToLibraryAsync(recordedVideo);
      Alert.alert('保存成功', '视频已保存到相册');
      setRecordedVideo(null);
    } catch (error) {
      Alert.alert('保存失败', '请检查相册权限');
    }
  }, [recordedVideo]);

  // 重录
  const retakeVideo = useCallback(() => {
    setRecordedVideo(null);
  }, []);

  // 加载相册照片
  const loadGalleryPhotos = useCallback(async () => {
    setShowGallery(true);
    setGalleryPhotos([]);
    
    try {
      const assets = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        sortBy: [MediaLibrary.SortBy.modificationTime],
        first: 50,
      });
      
      const chunks = [];
      for (let i = 0; i < assets.assets.length; i += 10) {
        chunks.push(assets.assets.slice(i, i + 10));
      }
      
      const results: { uri: string; id: string }[] = [];
      
      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map(async (asset) => {
            try {
              const info = await MediaLibrary.getAssetInfoAsync(asset);
              return { uri: info.localUri || asset.uri, id: asset.id };
            } catch {
              return { uri: asset.uri, id: asset.id };
            }
          })
        );
        results.push(...chunkResults);
        setGalleryPhotos([...results]);
      }
    } catch (error) {
      Alert.alert('无法访问相册', '请检查权限');
      setShowGallery(false);
    }
  }, []);

  // ---- 渲染 ----

  // 权限页面
  if (!cameraPermission?.granted) {
    return (
      <SafeAreaView style={s.permission}>
        <StatusBar barStyle="light-content" />
        <View style={s.permissionInner}>
          <Text style={s.permissionIcon}>📷</Text>
          <Text style={s.permissionTitle}>FILM CAM</Text>
          <Text style={s.permissionDesc}>需要相机权限才能拍摄胶片风格照片</Text>
          <TouchableOpacity style={s.permissionBtn} onPress={requestPermissions}>
            <Text style={s.permissionBtnTxt}>允许访问</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 照片预览模式
  if (capturedPhoto) {
    return (
      <View style={s.previewWrap}>
        <StatusBar hidden />
        <Image source={{ uri: capturedPhoto }} style={s.previewImg} resizeMode="contain" />

        {/* 顶部信息条 */}
        <View style={s.previewTopBar}>
          <TouchableOpacity onPress={retakePhoto} style={s.previewTopBtn}>
            <Text style={s.previewTopBtnTxt}>✕</Text>
          </TouchableOpacity>
          <View style={s.previewFilmBadge}>
            <Text style={s.previewFilmName}>{activeFilter.name}</Text>
          </View>
          <TouchableOpacity onPress={savePhoto} style={[s.previewTopBtn, s.previewSaveBtn]}>
            <Text style={[s.previewTopBtnTxt, s.previewSaveTxt]}>保存</Text>
          </TouchableOpacity>
        </View>

        {/* 底部操作 */}
        <View style={s.previewBottomBar}>
          <TouchableOpacity style={s.previewRetakeBtn} onPress={retakePhoto}>
            <Text style={s.previewRetakeTxt}>重拍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.previewSaveBigBtn} onPress={savePhoto}>
            <Text style={s.previewSaveBigTxt}>保存到相册</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 相册全屏预览模式（只读查看）
  if (galleryPreviewUri) {
    return (
      <View style={s.previewWrap}>
        <StatusBar hidden />
        <Image source={{ uri: galleryPreviewUri }} style={s.previewImg} resizeMode="contain" />
        <TouchableOpacity
          style={s.galleryFullBackBtn}
          onPress={() => setGalleryPreviewUri(null)}
        >
          <Text style={s.galleryFullBackTxt}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 视频预览模式
  if (recordedVideo) {
    return (
      <View style={s.previewWrap}>
        <StatusBar hidden />
        <Video
          source={{ uri: recordedVideo }}
          style={s.previewImg}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls
          isLooping={false}
        />

        {/* 顶部信息条 */}
        <View style={s.previewTopBar}>
          <TouchableOpacity onPress={retakeVideo} style={s.previewTopBtn}>
            <Text style={s.previewTopBtnTxt}>✕</Text>
          </TouchableOpacity>
          <View style={s.previewFilmBadge}>
            <Text style={s.previewFilmName}>VIDEO</Text>
          </View>
          <TouchableOpacity onPress={saveVideo} style={[s.previewTopBtn, s.previewSaveBtn]}>
            <Text style={[s.previewTopBtnTxt, s.previewSaveTxt]}>保存</Text>
          </TouchableOpacity>
        </View>

        {/* 底部操作 */}
        <View style={s.previewBottomBar}>
          <TouchableOpacity style={s.previewRetakeBtn} onPress={retakeVideo}>
            <Text style={s.previewRetakeTxt}>重录</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.previewSaveBigBtn} onPress={saveVideo}>
            <Text style={s.previewSaveBigTxt}>保存到相册</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 相册浏览模式
  if (showGallery) {
    return (
      <View style={s.galleryWrap}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        
        {/* 顶部栏 */}
        <View style={s.galleryTopBar}>
          <TouchableOpacity style={s.galleryBackBtn} onPress={() => setShowGallery(false)}>
            <Text style={s.galleryBackIcon}>←</Text>
          </TouchableOpacity>
          <Text style={s.galleryTitle}>相册</Text>
          <View style={{ width: 34 }} />
        </View>

        {/* 照片网格 */}
        <ScrollView contentContainerStyle={s.galleryGrid}>
          {galleryPhotos.map((asset) => (
            <TouchableOpacity
              key={asset.id}
              style={s.galleryItem}
              onPress={() => setGalleryPreviewUri(asset.uri)}
            >
              <Image source={{ uri: asset.uri }} style={s.galleryImage} resizeMode="cover" />
            </TouchableOpacity>
          ))}
          {galleryPhotos.length === 0 && (
            <View style={s.galleryEmpty}>
              <Text style={s.galleryEmptyTxt}>暂无照片</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // 主相机界面（CCD 风格）
  return (
    <View style={s.wrap}>
      <StatusBar hidden />

      {/* ===== 全屏相机预览 ===== */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode={mode}
        flash={flashMode}
        active={true}
      />

      {/* ===== 隐藏的滤镜处理器 WebView ===== */}
      <WebView
        ref={webViewRef}
        source={{ html: createFilterProcessorHTML() }}
        style={s.filterProcessor}
        onMessage={onWebViewMessage}
        javaScriptEnabled={true}
        originWhitelist={['*']}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />

      {/* ===== 聚焦触摸层 ===== */}
      <View
        style={StyleSheet.absoluteFill}
        onTouchStart={(e) => {
          const touch = e.nativeEvent.touches[0];
          handleFocus(touch.locationX, touch.locationY);
        }}
      />

      {/* ===== 相机覆盖层（绘制层，不拦截触摸） ===== */}
      <View style={[s.overlayWrap, { pointerEvents: 'none' }]}>
        {/* 取景框四角 */}
        <View style={s.cornerTL} />
        <View style={s.cornerTR} />
        <View style={s.cornerBL} />
        <View style={s.cornerBR} />

        {/* 网格线（可切换） */}
        {showGrid && (
          <View style={s.gridOverlay}>
            {[0.25, 0.5, 0.75].map((ratio) => (
              <React.Fragment key={`h-${ratio}`}>
                <View style={[s.gridLineH, { top: `${ratio * 100}%` }]} />
              </React.Fragment>
            ))}
            {[0.33, 0.66].map((ratio) => (
              <React.Fragment key={`v-${ratio}`}>
                <View style={[s.gridLineV, { left: `${ratio * 100}%` }]} />
              </React.Fragment>
            ))}
          </View>
        )}

        {/* 滤镜实时预览叠加层 — 简化单层叠加 */}
        {(() => {
          const params = buildFilterParams(activeFilter);
          
          if (params.isBW) {
            return (
              <View
                style={[
                  s.filterOverlay,
                  {
                    backgroundColor: '#777777',
                    opacity: 0.4 + params.vignette * 0.15,
                  },
                ]}
              />
            );
          }
          
          const layers = [];
          
          if (params.tintOpacity > 0.01) {
            layers.push(
              <View
                key="tint"
                style={[
                  s.filterOverlay,
                  {
                    backgroundColor: `rgba(${params.tintR}, ${params.tintG}, ${params.tintB}, ${params.tintOpacity})`,
                  },
                ]}
              />
            );
          }
          
          return <>{layers}</>;
        })()}

        {/* 聚焦指示器 */}
        {focusPoint && (
          <View 
            style={[
              s.focusIndicator,
              { 
                left: focusPoint.x - 40, 
                top: focusPoint.y - 40,
              },
            ]}
          >
            <View style={s.focusRing} />
            <View style={s.focusInner} />
          </View>
        )}

        {/* 右侧参数显示 */}
        <View style={s.paramPanel}>
          <Text style={s.paramText}>{activeFilter.subtitle}</Text>
          <View style={s.paramDot} />
        </View>
      </View>

      {/* ===== 控件层（顶层，可交互） ===== */}
      <View style={s.controlsLayer}>
        {/* 顶部信息栏 */}
        <View style={s.topBar}>
          <View style={s.topLeft}>
            {/* 闪光灯切换 */}
            <TouchableOpacity style={[s.flashBtn, flashMode === 'on' && s.flashBtnOn]} onPress={toggleFlash}>
              <Text style={[s.flashIcon, flashMode === 'on' && s.flashIconOn]}>⚡</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.galleryBtn} onPress={loadGalleryPhotos}>
              <Text style={s.galleryIcon}>🖼️</Text>
            </TouchableOpacity>
            <Text style={s.brand}>FILM CAM</Text>
          </View>
          <View style={s.topCenter}>
            <Text style={s.filmLabel}>{activeFilter.name}</Text>
          </View>
          <View style={s.topRight}>
            {/* 模式切换 */}
            <TouchableOpacity style={[s.modeBtn, mode === 'video' && s.modeBtnActive]} onPress={() => setMode((m) => (m === 'picture' ? 'video' : 'picture'))}>
              <Text style={[s.modeTxt, mode === 'video' && s.modeTxtActive]}>{mode === 'picture' ? 'PHOTO' : 'VIDEO'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 底部控制区（半透明遮罩） */}
        <View style={s.bottomArea}>
          {/* 分类标签栏 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.catScroll}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[s.catChip, activeCategory === cat.id && s.catChipActive]}
                onPress={() => setActiveCategory(cat.id)}
                activeOpacity={0.7}
              >
                <Text style={[s.catTxt, activeCategory === cat.id && s.catTxtActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* 胶卷选择器 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filmScroll}
            snapToInterval={76}
            decelerationRate="fast"
          >
            {filteredPresets.map((filter) => {
              const isActive = activeFilter.id === filter.id;
              return (
                <TouchableOpacity
                  key={filter.id}
                  style={[s.filmCard, isActive && s.filmCardActive]}
                  onPress={() => setActiveFilter(filter)}
                  activeOpacity={0.8}
                >
                  {/* 胶卷罐外观 */}
                  <View style={[s.canister, { backgroundColor: getFilterColor(filter) }]}>
                    {filter.isBW && (
                      <View style={s.bwTag}>
                        <Text style={s.bwTagTxt}>B&W</Text>
                      </View>
                    )}
                    {isActive && <View style={s.canisterRing} />}
                  </View>
                  <Text style={[s.filmName, isActive && s.filmNameActive]} numberOfLines={1}>
                    {filter.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 控制按钮行 */}
          <View style={s.controlRow}>
            {/* 左：翻转相机 */}
            <TouchableOpacity style={s.sideBtn} onPress={toggleCameraFacing} activeOpacity={0.7}>
              <Text style={s.sideIcon}>⟲</Text>
            </TouchableOpacity>

            {/* 中间：快门按钮（拍照）或录制按钮（视频） */}
            {mode === 'picture' ? (
              <TouchableOpacity
                style={[s.shutterOuter, isCapturing && s.shutterActive]}
                onPress={takePicture}
                disabled={isCapturing}
                activeOpacity={0.9}
              >
                <View style={s.shutterMiddle}>
                  <View style={s.shutterInner} />
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.recordBtn, isRecording && s.recordBtnActive]}
                onPress={toggleRecording}
                disabled={isCapturing}
                activeOpacity={0.9}
              >
                {isRecording ? <View style={s.recordIndicator} /> : <View style={s.recordInner} />}
              </TouchableOpacity>
            )}

            {/* 右：切换网格 */}
            <TouchableOpacity style={s.sideBtn} onPress={toggleGrid} activeOpacity={0.7}>
              <Text style={s.sideIcon}>{showGrid ? '▦' : '⊞'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

// ============================================================
// 样式表 — CCD 风格
// ============================================================
const s = StyleSheet.create({
  // --- 容器 ---
  wrap: { flex: 1, backgroundColor: '#000' },
  filterProcessor: {
    position: 'absolute',
    width: 2,
    height: 2,
    opacity: 0.01,
    top: -5,
    left: -5,
  },
  overlayWrap: {
    ...StyleSheet.absoluteFillObject,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  controlsLayer: {
    ...StyleSheet.absoluteFillObject,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // --- 取景框四角 ---
  cornerTL: {
    position: 'absolute', top: 48, left: 16,
    width: 28, height: 28,
    borderTopWidth: 2, borderLeftWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  cornerTR: {
    position: 'absolute', top: 48, right: 16,
    width: 28, height: 28,
    borderTopWidth: 2, borderRightWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  cornerBL: {
    position: 'absolute', bottom: 250, left: 16,
    width: 28, height: 28,
    borderBottomWidth: 2, borderLeftWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  cornerBR: {
    position: 'absolute', bottom: 250, right: 16,
    width: 28, height: 28,
    borderBottomWidth: 2, borderRightWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
  },

  // --- 顶部信息栏 ---
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  galleryBtn: {
    width: 34, height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryIcon: { fontSize: 16, color: '#fff' },
  brand: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 3,
  },
  topCenter: {
    alignItems: 'center',
  },
  filmLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    letterSpacing: 1,
  },
  topRight: {},

  // --- 闪光灯按钮 ---
  flashBtn: {
    width: 34, height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashBtnOn: {
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  flashIcon: {
    fontSize: 18,
    color: '#fff',
  },
  flashIconOn: {
    color: '#000',
  },

  // --- 模式切换按钮 ---
  modeBtn: {
    paddingHorizontal: 14,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  modeTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  modeTxtActive: {
    color: '#000',
  },

  // --- 网格 ---
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLineH: {
    position: 'absolute',
    left: 30, right: 30,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  gridLineV: {
    position: 'absolute',
    top: 60, bottom: 230,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },

  // --- 滤镜叠加层 ---
  filterOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  // --- 参数面板 ---
  paramPanel: {
    position: 'absolute',
    top: 100,
    right: 14,
    alignItems: 'flex-end',
  },
  paramText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 3,
  },

  // --- 聚焦指示器 ---
  focusIndicator: {
    position: 'absolute',
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#fff',
    opacity: 0.8,
  },
  focusInner: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  paramDot: {
    width: 5, height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },

  // ========== 底部控制区 ==========
  bottomArea: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(10,10,10,0.92)',
    borderTopColor: 'rgba(255,255,255,0.06)',
    borderTopWidth: 0.5,
    paddingTop: 8,
    paddingBottom: 28,
  },

  // --- 分类标签 ---
  catScroll: {
    paddingHorizontal: 18,
    gap: 7,
    marginBottom: 6,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  catChipActive: {
    backgroundColor: 'rgba(212,165,116,0.9)',
  },
  catTxt: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  catTxtActive: {
    color: '#111',
    fontWeight: '600',
  },

  // --- 胶卷选择器 ---
  filmScroll: {
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 8,
  },
  filmCard: {
    alignItems: 'center',
    width: 70,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  filmCardActive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  canister: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  canisterRing: {
    position: 'absolute',
    width: 54, height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  bwTag: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  bwTagTxt: {
    fontSize: 7,
    fontWeight: '700',
    color: '#eee',
  },
  filmName: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
    textAlign: 'center',
  },
  filmNameActive: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },

  // --- 控制按钮行 ---
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 36,
    paddingTop: 4,
    paddingBottom: 2,
  },
  sideBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideIcon: { fontSize: 19, color: '#fff' },

  // 快门（CCD 风格：外圈金属环 → 中圈 → 内核）
  shutterOuter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    // 外发光效果
    shadowColor: '#d4a574',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  shutterActive: {
    backgroundColor: '#d4a574',
  },
  shutterMiddle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#e8e8e8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#bbb',
  },
  shutterInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
  },

  // --- 视频录制按钮 ---
  recordBtn: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255,50,50,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff3232',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  recordBtnActive: {
    backgroundColor: '#ff3232',
  },
  recordInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  recordIndicator: {
    width: 20,
    height: 20,
    borderRadius: 3,
    backgroundColor: '#fff',
  },

  // ========== 权限页面 ==========
  permission: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  permissionInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionIcon: { fontSize: 52, marginBottom: 16 },
  permissionTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 6,
    marginBottom: 12,
  },
  permissionDesc: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionBtn: {
    backgroundColor: '#d4a574',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 26,
  },
  permissionBtnTxt: {
    color: '#111',
    fontSize: 16,
    fontWeight: '700',
  },

  // ========== 预览页面 ==========
  previewWrap: { flex: 1, backgroundColor: '#000' },
  previewImg: { flex: 1 },
  previewTopBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  previewTopBtn: {
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewTopBtnTxt: { fontSize: 18, color: '#fff' },
  previewFilmBadge: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
  },
  previewFilmName: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  previewSaveBtn: {
    backgroundColor: '#d4a574',
  },
  previewSaveTxt: {
    color: '#111',
    fontSize: 13,
    fontWeight: '700',
  },
  previewBottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 30,
    backgroundColor: 'rgba(5,5,5,0.92)',
    gap: 16,
  },
  previewRetakeBtn: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    flex: 1,
    alignItems: 'center',
  },
  previewRetakeTxt: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  previewSaveBigBtn: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 22,
    backgroundColor: '#d4a574',
    flex: 1,
    alignItems: 'center',
  },
  previewSaveBigTxt: {
    color: '#111',
    fontSize: 15,
    fontWeight: '700',
  },

  // ========== 相册浏览页面 ==========
  galleryWrap: {
    flex: 1,
    backgroundColor: '#000',
  },
  galleryTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#0a0a0a',
    borderBottomColor: 'rgba(255,255,255,0.06)',
    borderBottomWidth: 0.5,
  },
  galleryBackBtn: {
    width: 34, height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryBackIcon: { fontSize: 18, color: '#fff' },
  galleryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  galleryGrid: {
    padding: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  galleryItem: {
    flex: 1,
    minWidth: '33.33%',
    aspectRatio: 1,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 4,
    marginBottom: 4,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  galleryEmptyTxt: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.35)',
  },

  // --- 相册全屏查看关闭按钮 ---
  galleryFullBackBtn: {
    position: 'absolute',
    top: 52,
    left: 20,
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryFullBackTxt: {
    fontSize: 18,
    color: '#fff',
  },
});
