declare module 'react-native-torch' {
  const Torch: {
    switchState(enabled: boolean): Promise<void>;
  };

  export default Torch;
}
