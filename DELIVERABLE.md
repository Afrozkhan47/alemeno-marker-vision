# Technical Deliverable: Custom Marker Detection & Extraction

## Project Overview
**Title**: Marker Vision  
**Assignment**: Custom Marker Detection Internship Task  
**Platform**: Android (Expo SDK 54 / React Native)

## Problem Statement
The objective was to develop a React Native application capable of detecting and extracting custom markers from a live camera feed. The implementation required high-resolution processing (2000-3000px), robustness to orientation and skew, and the collection of 20 processed markers, each exactly 300x300 px, delivered with minimal latency.

## Approach & Architecture
To avoid the complexities and bundle size of native OpenCV bindings while maintaining high performance, the project implements a **pure TypeScript Computer Vision pipeline**. The architecture is decoupled into UI components, camera services, and a modular detection engine.

### Detection Pipeline
The pipeline consists of the following stages:
1. **High-Resolution Capture**: Utilizing `expo-camera`, the app captures frames in the 2000-3000px range to ensure high precision in corner detection.
2. **Native-Free Decoding**: A custom JPEG decoder (`jpegDecode.ts`) processes the raw byte stream into an RGBA buffer directly in JavaScript.
3. **Adaptive Thresholding**: Implements **Otsu's Method** to calculate an optimal binarization threshold, ensuring robustness across varying lighting conditions.
4. **Region Proposal**: A flood-fill based connected component algorithm identifies candidate dark regions in the binary mask.
5. **Heuristic Filtering**: Candidates are validated against area, aspect ratio, and contrast thresholds to reject false positives.

### Marker Extraction Logic
1. **Corner Estimation**: The algorithm identifies the four extremal points of the detected quad.
2. **Perspective Correction**: A 3x3 homography matrix is computed to map the distorted quadrilateral to a perfect 300x300 square.
3. **Bilinear Warping**: High-quality sampling ensures the extracted marker is sharp and devoid of aliasing artifacts.
4. **Normalization**: Every output is encoded into a standard PNG Data URL for seamless UI rendering and portability.

## Performance Considerations
- **Downscaling**: The initial detection pass happens on a downscaled grayscale version of the frame to keep processing time low.
- **Memory Management**: Byte arrays and typed arrays are reused where possible to minimize garbage collection overhead during high-res processing.
- **Asynchronous Execution**: Captures and processing are interleaved to maintain a responsive UI.

## Challenges & Solutions
- **Challenge**: Large JPEGs causing UI lag.
- **Solution**: Implemented a sequential capture-then-process loop with a "Processing" status pill to inform the user of background activity.
- **Challenge**: Orientation robustness.
- **Solution**: Developed a corner ordering algorithm that ensures the "top-left" of the marker is consistently identified based on coordinate geometry.

## Future Improvements
- **Worker Threads**: Moving the CV pipeline to a separate Worklet or WebWorker to achieve true zero-lag UI.
- **ArUco ID Matching**: Adding bit-pattern verification to uniquely identify specific markers.
- **Hardware Acceleration**: Leveraging GPU shaders via `react-native-skia` for even faster perspective warping.
