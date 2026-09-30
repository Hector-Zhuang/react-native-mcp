#import "Connectivity.h"
#import <AVFoundation/AVFoundation.h>

@implementation Connectivity

- (void)setFlashlight:(BOOL)enabled
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject {
  AVCaptureDevice *device = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo];
  if (device == nil || ![device hasTorch]) {
    reject(@"UNAVAILABLE", @"This device has no flashlight.", nil);
    return;
  }

  void (^applyTorch)(void) = ^{
    NSError *error = nil;
    if (![device lockForConfiguration:&error]) {
      reject(@"UNAVAILABLE", error.localizedDescription ?: @"The flashlight is unavailable.", error);
      return;
    }

    if (enabled) {
      [device setTorchModeOnWithLevel:AVCaptureMaxAvailableTorchLevel error:&error];
    } else {
      device.torchMode = AVCaptureTorchModeOff;
    }
    [device unlockForConfiguration];

    if (error != nil) {
      reject(@"UNAVAILABLE", error.localizedDescription ?: @"The flashlight is unavailable.", error);
    } else {
      resolve(nil);
    }
  };

  AVAuthorizationStatus status = [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo];
  if (status == AVAuthorizationStatusAuthorized) {
    applyTorch();
  } else if (status == AVAuthorizationStatusNotDetermined) {
    [AVCaptureDevice requestAccessForMediaType:AVMediaTypeVideo completionHandler:^(BOOL granted) {
      dispatch_async(dispatch_get_main_queue(), ^{
        if (granted) {
          applyTorch();
        } else {
          reject(@"PERMISSION_DENIED", @"Camera permission was denied.", nil);
        }
      });
    }];
  } else {
    reject(@"PERMISSION_DENIED", @"Camera permission was denied.", nil);
  }
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeConnectivitySpecJSI>(params);
}

+ (NSString *)moduleName {
  return @"Connectivity";
}

@end
