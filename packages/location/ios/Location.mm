#import "Location.h"
#import "Location-Swift.h"

@implementation Location

- (void)requestPermission:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject {
  [[ReactNativeMcpLocationImpl shared] requestPermission:resolve reject:reject];
}

- (void)getCurrentPosition:(NSString *)accuracy
                 timeoutMs:(double)timeoutMs
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject {
  [[ReactNativeMcpLocationImpl shared] getCurrentPosition:accuracy
                                           timeoutMs:timeoutMs
                                             resolve:resolve
                                              reject:reject];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeLocationSpecJSI>(params);
}

+ (NSString *)moduleName {
  return @"Location";
}

@end
