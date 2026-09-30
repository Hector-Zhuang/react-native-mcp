import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  share(
    text: string | null,
    url: string | null,
    imageUri: string | null,
    subject: string | null,
  ): Promise<Object>;
}

export default TurboModuleRegistry.get<Spec>('Share');
