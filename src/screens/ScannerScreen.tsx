import type { MutableRefObject } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { detectMarkerFromUri } from '@/services/markerProcessing';
import { ScannerHUD } from '@/components/scanner/ScannerHUD';
import { ScannerOverlay } from '@/components/scanner/ScannerOverlay';
import { ScannerStatusPanel } from '@/components/scanner/ScannerStatusPanel';
import { SCAN_SESSION_FRAME_COUNT } from '@/constants/scanSession';
import { AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { RootStackParamList } from '@/types/navigation';
import { ScannerPillStatus } from '@/types/scanner';

type Props = NativeStackScreenProps<RootStackParamList, 'Scanner'>;

type CapturedFrameMetadata = {
  uri: string;
  width: number;
  height: number;
  capturedAt: number;
};

const CAMERA_INIT_TIMEOUT_MS = 14000;

function clearTimers(navigateTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (navigateTimeoutRef.current) {
    clearTimeout(navigateTimeoutRef.current);
    navigateTimeoutRef.current = null;
  }
}

const parsePictureSize = (pictureSize: string) => {
  const [widthStr, heightStr] = pictureSize.split('x');
  const width = Number(widthStr);
  const height = Number(heightStr);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }
  return { pictureSize, width, height };
};

const chooseBestPictureSize = (sizes: string[] | null | undefined) => {
  if (!sizes?.length) {
    return undefined;
  }

  const parsed = sizes
    .map(parsePictureSize)
    .filter((value): value is { pictureSize: string; width: number; height: number } => value !== null);

  if (!parsed.length) {
    return undefined;
  }

  const inRange = parsed.filter(
    ({ width, height }) =>
      width >= 2000 && height >= 2000 && width <= 3000 && height <= 3000,
  );

  if (inRange.length) {
    return inRange.sort((a, b) => b.width * b.height - a.width * a.height)[0].pictureSize;
  }

  return parsed
    .map((size) => ({
      ...size,
      distance: Math.max(
        0,
        2000 - Math.min(size.width, size.height),
        Math.max(size.width, size.height) - 3000,
      ),
    }))
    .sort((a, b) => {
      if (a.distance !== b.distance) {
        return a.distance - b.distance;
      }
      return b.width * b.height - a.width * a.height;
    })[0]?.pictureSize;
};

export const ScannerScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  const [permission, requestPermission] = useCameraPermissions();

  const navigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanStartedAtRef = useRef<number>(0);
  const scanSessionRef = useRef(0);
  const cameraRef = useRef<CameraView | null>(null);
  const capturedFrameMetadataRef = useRef<CapturedFrameMetadata[]>([]);

  const [pictureSize, setPictureSize] = useState<string | undefined>(undefined);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [framesCaptured, setFramesCaptured] = useState(0);
  const [processingLatencyMs, setProcessingLatencyMs] = useState(0);
  const [cameraMountError, setCameraMountError] = useState<string | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isNavigatingToResults, setIsNavigatingToResults] = useState(false);

  const scanActionLockRef = useRef(false);
  const autoPromptedRef = useRef(false);

  const hasPermission = permission?.granted === true;
  const permissionBlocked = Boolean(
    permission && !permission.granted && permission.canAskAgain === false,
  );
  const canPromptPermission = Boolean(
    permission && !permission.granted && permission.canAskAgain !== false,
  );
  const permissionResolved = permission != null;

  const isCameraHealthy = hasPermission && !cameraMountError;
  const isCameraReady = isCameraHealthy && !isInitializing;
  const fps = useMemo(() => (isFocused ? 30 : 0), [isFocused]);

  const activePill: ScannerPillStatus = isScanning
    ? 'scanning'
    : isCameraReady
      ? 'ready'
      : 'searching';

  const cameraStatusLabel = useMemo(() => {
    if (!hasPermission) {
      return permissionBlocked ? 'Access denied' : 'No access';
    }
    if (cameraMountError) {
      return 'Unavailable';
    }
    if (isInitializing) {
      return 'Starting…';
    }
    return 'Online';
  }, [cameraMountError, hasPermission, isInitializing, permissionBlocked]);

  const detectionStatusLabel = useMemo(
    () =>
      cameraMountError && hasPermission
        ? 'Camera error'
        : isScanning
          ? 'Scanning active'
          : 'Searching marker',
    [cameraMountError, hasPermission, isScanning],
  );

  /** Keep Back above status panel on short and tall phones */
  const backOffsetBottom = useMemo(() => {
    const { panelReserve } = theme.scanner;
    const scaled = Math.min(Math.max(windowHeight * 0.31, 212), 276);
    return Math.max(panelReserve, scaled) + Math.max(insets.bottom, theme.spacing.xs);
  }, [insets.bottom, theme.spacing.xs, theme.scanner, windowHeight]);

  const bumpScanSession = useCallback(() => {
    scanSessionRef.current += 1;
    return scanSessionRef.current;
  }, []);

  const clearScanTimers = useCallback(() => {
    clearTimers(navigateTimeoutRef);
  }, []);

  const handleCameraReady = useCallback(async () => {
    setCameraMountError(null);
    setIsInitializing(false);

    if (!cameraRef.current) {
      return;
    }

    try {
      const pictureSizes = await cameraRef.current.getAvailablePictureSizesAsync();
      const selectedSize = chooseBestPictureSize(pictureSizes);
      if (selectedSize) {
        setPictureSize(selectedSize);
        console.warn('[Scanner] selected pictureSize', selectedSize);
      } else {
        console.warn('[Scanner] available pictureSizes', pictureSizes);
      }
    } catch (error) {
      console.warn('[Scanner] failed to resolve picture sizes', error);
    }
  }, []);

  const stopScanPipeline = useCallback(
    ({ resetCounters }: { resetCounters: boolean }) => {
      clearScanTimers();
      bumpScanSession();
      setIsNavigatingToResults(false);
      setIsScanning(false);
      if (resetCounters) {
        setFramesCaptured(0);
        setProcessingLatencyMs(0);
        capturedFrameMetadataRef.current = [];
      }
      scanActionLockRef.current = false;
    },
    [bumpScanSession, clearScanTimers],
  );

  /** Start disabled unless camera idle + ready; stop enabled while scanning (unless transitioning) */
  const scanToggleDisabled =
    isNavigatingToResults || (!isScanning && (!isCameraReady || Boolean(cameraMountError)));

  useFocusEffect(
    useCallback(() => {
      void Camera.getCameraPermissionsAsync();
    }, []),
  );

  useEffect(() => {
    if (!hasPermission || !isInitializing || cameraMountError) {
      return;
    }

    const initTimer = setTimeout(() => {
      setCameraMountError('Camera took too long to start. Go back and try again.');
      setIsInitializing(false);
    }, CAMERA_INIT_TIMEOUT_MS);

    return () => clearTimeout(initTimer);
  }, [cameraMountError, hasPermission, isInitializing]);

  useEffect(() => {
    if (!canPromptPermission || autoPromptedRef.current) {
      return;
    }

    autoPromptedRef.current = true;
    void requestPermission().catch(() => {});
  }, [canPromptPermission, requestPermission]);

  useEffect(() => {
    setCameraMountError(null);
    setIsInitializing(true);
  }, [hasPermission]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    if (isScanning || isNavigatingToResults) {
      return;
    }

    if (framesCaptured >= SCAN_SESSION_FRAME_COUNT) {
      setFramesCaptured(0);
      setProcessingLatencyMs(0);
    }
  }, [framesCaptured, isFocused, isNavigatingToResults, isScanning]);

  useEffect(() => {
    if (isFocused) {
      return;
    }

    const pendingNavigateToResults = navigateTimeoutRef.current !== null;

    if (!pendingNavigateToResults) {
      bumpScanSession();
      scanActionLockRef.current = false;
      setIsNavigatingToResults(false);
      setIsScanning(false);
      setFramesCaptured(0);
      setProcessingLatencyMs(0);
    }
  }, [bumpScanSession, isFocused]);

  useEffect(
    () => () => {
      clearTimers(navigateTimeoutRef);
    },
    [],
  );

  useEffect(
    () =>
      navigation.addListener('beforeRemove', () => {
        clearScanTimers();
        bumpScanSession();
      }),
    [bumpScanSession, clearScanTimers, navigation],
  );

  const handleRequestPermission = useCallback(async () => {
    if (isRequestingPermission) {
      return;
    }
    setIsRequestingPermission(true);
    try {
      await requestPermission();
    } finally {
      setIsRequestingPermission(false);
    }
  }, [isRequestingPermission, requestPermission]);

  const handleToggleScan = useCallback(async () => {
    if (scanActionLockRef.current || isNavigatingToResults) {
      return;
    }

    if (!isFocused) {
      return;
    }

    if (isScanning) {
      stopScanPipeline({ resetCounters: true });
      return;
    }

    if (!isCameraReady || cameraMountError) {
      return;
    }

    if (!cameraRef.current) {
      console.warn('[Scanner] camera reference is not available');
      return;
    }

    scanActionLockRef.current = true;
    clearScanTimers();

    const session = bumpScanSession();
    scanStartedAtRef.current = Date.now();
    capturedFrameMetadataRef.current = [];

    setFramesCaptured(0);
    setProcessingLatencyMs(0);
    setIsScanning(true);
    scanActionLockRef.current = false;

    const pictureOptions = {
      quality: 1,
      skipProcessing: true,
      exif: false,
      ...(pictureSize ? { pictureSize } : {}),
    } as const;

    let validFramesCaptured = 0;
    const extractedMarkers: {
      dataUrl: string;
      width: number;
      height: number;
      sourceUri: string;
    }[] = [];
    const maxCaptureAttempts = SCAN_SESSION_FRAME_COUNT * 2;

    for (let attempt = 0; validFramesCaptured < SCAN_SESSION_FRAME_COUNT && attempt < maxCaptureAttempts; attempt += 1) {
      if (scanSessionRef.current !== session) {
        break;
      }

      try {
        const result = await cameraRef.current.takePictureAsync(pictureOptions);
        if (scanSessionRef.current !== session) {
          break;
        }

        const captureTime = Date.now();
        const detection = await detectMarkerFromUri(result.uri);

        if (!detection) {
          console.warn('Detection failed');
          console.warn('[Scanner] rejected candidate attempt', attempt + 1, 'of', maxCaptureAttempts);
          setProcessingLatencyMs(captureTime - scanStartedAtRef.current);
          continue;
        }

        console.info('Valid marker found');
        const frameMeta: CapturedFrameMetadata = {
          uri: result.uri,
          width: result.width ?? 0,
          height: result.height ?? 0,
          capturedAt: captureTime,
        };

        capturedFrameMetadataRef.current.push(frameMeta);
        extractedMarkers.push(detection.normalizedMarker);
        validFramesCaptured += 1;
        setFramesCaptured(validFramesCaptured);
        setProcessingLatencyMs(captureTime - scanStartedAtRef.current);

        console.info('Captured:', validFramesCaptured);
        console.warn('[Scanner] accepted marker candidate', validFramesCaptured, frameMeta);
      } catch (error) {
        console.warn('[Scanner] capture failed', error);
        break;
      }
    }

    if (scanSessionRef.current !== session) {
      setIsScanning(false);
      scanActionLockRef.current = false;
      return;
    }

    setIsScanning(false);

    const capturedCount = capturedFrameMetadataRef.current.length;
    const processingMs = Math.max(Date.now() - scanStartedAtRef.current, 0);
    setProcessingLatencyMs(processingMs);

    if (capturedCount === 0) {
      Alert.alert(
        'No Marker Detected',
        'No valid marker detected. Try pointing the camera at a supported marker.',
        [{ text: 'OK', onPress: () => (scanActionLockRef.current = false) }],
      );
      return;
    }

    setIsNavigatingToResults(true);
    navigateTimeoutRef.current = setTimeout(() => {
      navigateTimeoutRef.current = null;
      navigation.navigate('Results', {
        capturedFrames: capturedCount,
        processingMs,
        extractedMarkers,
      });
      setIsNavigatingToResults(false);
      scanActionLockRef.current = false;
    }, 280);
  }, [
    bumpScanSession,
    cameraMountError,
    clearScanTimers,
    isCameraReady,
    isFocused,
    isNavigatingToResults,
    isScanning,
    navigation,
    pictureSize,
    stopScanPipeline,
  ]);

  const showPermissionDeniedCard = permissionResolved && !hasPermission;

  const permissionCardWidth = Math.min(
    windowWidth - theme.layout.screenPaddingH * 2,
    theme.layout.maxContentWidth,
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {!permissionResolved ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.surface }]} />
      ) : null}

      {hasPermission ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          active={isFocused}
          facing="back"
          pictureSize={pictureSize}
          onCameraReady={handleCameraReady}
          onMountError={(event) => {
            setCameraMountError(event.message ?? 'Camera failed to start.');
            setIsInitializing(false);
          }}
        />
      ) : permissionResolved ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.surface }]} />
      ) : null}

      <ScannerOverlay />
      <ScannerHUD fps={fps} />
      <ScannerStatusPanel
        framesCaptured={framesCaptured}
        cameraStatus={cameraStatusLabel}
        detectionStatus={detectionStatusLabel}
        processingLatencyMs={processingLatencyMs}
        activePill={activePill}
        onToggleScan={handleToggleScan}
        isScanning={isScanning}
        scanToggleDisabled={scanToggleDisabled}
        showProcessingLatency={isScanning}
      />

      {showPermissionDeniedCard ? (
        <View
          style={[
            styles.permissionContainer,
            {
              alignSelf: 'center',
              width: permissionCardWidth,
              maxHeight: Math.min(windowHeight * 0.42, 320),
              borderRadius: theme.radius.md,
              borderColor: theme.overlay.border,
              backgroundColor: theme.overlay.modal,
              padding: theme.spacing.md,
              gap: theme.spacing.sm,
            },
          ]}
        >
          <Text
            style={[theme.typography.cardTitle, { color: theme.colors.text }]}
            numberOfLines={2}
          >
            {permissionBlocked ? 'Camera blocked' : 'Camera access needed'}
          </Text>
          <Text
            style={[theme.typography.body, { color: theme.colors.textMuted }]}
            numberOfLines={4}
          >
            {permissionBlocked
              ? 'Turn on camera access for this app in system settings.'
              : 'Camera access is required to scan markers.'}
          </Text>

          {!permissionBlocked ? (
            <Pressable
              style={({ pressed }) => [
                {
                  marginTop: theme.spacing.xs,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.primary,
                  minHeight: theme.button.minHeight,
                  paddingVertical: theme.button.paddingVertical,
                  paddingHorizontal: theme.button.paddingHorizontal,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed || isRequestingPermission ? AppTheme.pressedOpacity : 1,
                },
              ]}
              disabled={isRequestingPermission}
              onPress={handleRequestPermission}
            >
              {isRequestingPermission ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[theme.typography.button, { color: '#FFFFFF' }]}>
                  Grant permission
                </Text>
              )}
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                {
                  marginTop: theme.spacing.xs,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.primary,
                  minHeight: theme.button.minHeight,
                  paddingVertical: theme.button.paddingVertical,
                  paddingHorizontal: theme.button.paddingHorizontal,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? AppTheme.pressedOpacity : 1,
                },
              ]}
              onPress={() => {
                void Linking.openSettings();
              }}
            >
              <Text style={[theme.typography.button, { color: '#FFFFFF' }]}>Open Settings</Text>
            </Pressable>
          )}
        </View>
      ) : null}

      {!permissionResolved ? (
        <View
          style={[
            styles.initializingOverlay,
            {
              maxWidth: windowWidth - theme.layout.screenPaddingH * 2,
              borderRadius: theme.radius.sm,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.sm,
              backgroundColor: theme.overlay.initializing,
              borderColor: theme.overlay.border,
            },
          ]}
        >
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text
            style={[theme.typography.body, { color: theme.colors.text, flexShrink: 1 }]}
            numberOfLines={2}
          >
            Checking access…
          </Text>
        </View>
      ) : null}

      {permissionResolved && permission.granted && isInitializing && !cameraMountError ? (
        <View
          style={[
            styles.initializingOverlay,
            {
              maxWidth: windowWidth - theme.layout.screenPaddingH * 2,
              borderRadius: theme.radius.sm,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.sm,
              backgroundColor: theme.overlay.initializing,
              borderColor: theme.overlay.border,
            },
          ]}
        >
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text
            style={[theme.typography.body, { color: theme.colors.text, flexShrink: 1 }]}
            numberOfLines={2}
          >
            Starting camera…
          </Text>
        </View>
      ) : null}

      <View
        style={[
          styles.backButtonWrap,
          { left: theme.layout.screenPaddingH, bottom: backOffsetBottom },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            {
              borderRadius: theme.radius.sm,
              paddingHorizontal: theme.spacing.sm,
              minHeight: 40,
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: theme.overlay.border,
              backgroundColor: theme.overlay.hudPanel,
              opacity: pressed || isNavigatingToResults ? AppTheme.pressedOpacity : 1,
            },
          ]}
          disabled={isNavigatingToResults}
          accessibilityState={{ disabled: isNavigatingToResults }}
          onPress={() => {
            stopScanPipeline({ resetCounters: true });
            navigation.goBack();
          }}
        >
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600' }]}>
            Back
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  permissionContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '34%',
    borderWidth: 1,
  },
  initializingOverlay: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    marginTop: -24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
  },
  backButtonWrap: {
    position: 'absolute',
  },
});
