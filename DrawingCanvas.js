import React, {useState, useRef} from 'react';
import {
  View,
  Button,
  Image,
  StyleSheet,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import {launchImageLibrary} from 'react-native-image-picker';
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import {Canvas, Path} from '@shopify/react-native-skia';
import {runOnJS} from 'react-native-reanimated';
import RNFS from 'react-native-fs';
import ViewShot from 'react-native-view-shot';
import ImageResizer from 'react-native-image-resizer';

const DrawingCanvas = () => {
  const [imageUri, setImageUri] = useState(null);
  const [paths, setPaths] = useState([]);
  const ref = useRef();

  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission',
          message: 'This app needs access to your storage to save images.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const addNewPath = (x, y) => {
    setPaths(prevPaths => {
      const newPaths = [...prevPaths];
      newPaths.push({
        segments: [`M ${x} ${y}`],
        color: '#06d6a0',
      });
      return newPaths;
    });
  };

  const updateCurrentPath = (x, y) => {
    setPaths(prevPaths => {
      const newPaths = [...prevPaths];
      if (newPaths.length > 0) {
        newPaths[newPaths.length - 1].segments.push(`L ${x} ${y}`);
      }
      return newPaths;
    });
  };

  const pan = Gesture.Pan()
    .onStart(g => {
      runOnJS(addNewPath)(g.x, g.y);
    })
    .onUpdate(g => {
      runOnJS(updateCurrentPath)(g.x, g.y);
    })
    .minDistance(1);

  const pickImage = () => {
    launchImageLibrary({}, response => {
      if (response.uri) {
        setImageUri(response.uri);
      }
    });
  };

  const refreshMediaStore = async filePath => {
    if (Platform.OS === 'android') {
      // For Android, use MediaScanner to refresh the media store
      try {
        const mediaScanResult = await RNFS.scanFile(filePath);
        console.log('Media scan result:', mediaScanResult);
      } catch (error) {
        console.error('Error scanning media file:', error);
      }
    } else if (Platform.OS === 'ios') {
      // For iOS, use PHPhotoLibrary to add the image to the photo library
      try {
        await RNFS.readFile(filePath, 'base64').then(async base64String => {
          await CameraRoll.save(filePath);
        });
      } catch (error) {
        console.error('Error saving image to camera roll:', error);
      }
    }
  };

  const saveImage = async () => {
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) return;

    ref.current.capture().then(capturedUri => {
      console.log('do something with ', capturedUri);

      // Resize the captured image
      ImageResizer.createResizedImage(capturedUri, 300, 300, 'PNG', 100)
        .then(resizedImage => {
          const resizedUri = resizedImage.uri;

          const newPath = `file://${
            RNFS.DocumentDirectoryPath
          }/drawing_${Date.now()}.jpeg`;
          RNFS.copyFile(resizedUri, newPath)
            .then(success => {
              refreshMediaStore(newPath);
            })
            .catch(err => {
              console.log('save error', err.message);
            });
        })
        .catch(err => {
          console.error('Error resizing image:', err);
        });
    });
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <Button title="Pick an image from gallery" onPress={pickImage} />
      <ViewShot
        ref={ref}
        options={{fileName: 'Your-File-Name', format: 'jpg', quality: 0.9}}>
        {imageUri && (
          <View style={styles.imageContainer}>
            <Image source={{uri: imageUri}} style={styles.image} />
            <GestureDetector gesture={pan}>
              <Canvas style={{...StyleSheet.absoluteFillObject}}>
                {paths.map((p, index) => (
                  <Path
                    key={index}
                    path={p.segments.join(' ')}
                    strokeWidth={5}
                    style="stroke"
                    color={p.color}
                  />
                ))}
              </Canvas>
            </GestureDetector>
          </View>
        )}
      </ViewShot>
      <Button title="Save Image with resize to 300x300" onPress={saveImage} />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: 300,
    height: 300,
  },
});

export default DrawingCanvas;
