import React from 'react';
import {StyleSheet} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import DrawingCanvas from './DrawingCanvas';

const App = () => {
  return (
    <GestureHandlerRootView style={styles.container}>
      <DrawingCanvas />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
