declare module 'react-native-system-setting' {
  const SystemSetting: {
    getBrightness(): Promise<number>;
    setBrightnessForce(value: number): Promise<boolean>;
  };

  export default SystemSetting;
}
