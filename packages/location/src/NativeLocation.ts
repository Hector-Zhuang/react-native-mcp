import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  requestPermission(): Promise<Object>;

  getCurrentPosition(accuracy: string, timeoutMs: number): Promise<Object>;
}

export default TurboModuleRegistry.get<Spec>('Location');
