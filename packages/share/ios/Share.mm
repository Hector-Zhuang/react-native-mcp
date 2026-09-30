#import "Share.h"
#import "Share-Swift.h"

@implementation Share

- (void)share:(NSString *)text
          url:(NSString *)url
     imageUri:(NSString *)imageUri
      subject:(NSString *)subject
      resolve:(RCTPromiseResolveBlock)resolve
       reject:(RCTPromiseRejectBlock)reject {
  [[ReactNativeMcpShareImpl shared] share:text
                                 url:url
                            imageUri:imageUri
                             subject:subject
                             resolve:resolve
                              reject:reject];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeShareSpecJSI>(params);
}

+ (NSString *)moduleName {
  return @"Share";
}

@end
