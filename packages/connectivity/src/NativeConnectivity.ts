import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  setFlashlight(enabled: boolean): Promise<void>;
}

export default TurboModuleRegistry.get<Spec>('Connectivity');
