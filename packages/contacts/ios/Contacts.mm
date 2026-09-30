#import "Contacts.h"
#import "Contacts-Swift.h"

@implementation Contacts

- (void)requestPermission:(BOOL)writeAccess
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject {
  [[ReactNativeMcpContactsImpl shared]
      requestPermission:writeAccess
                 resolve:^(NSDictionary<NSString *, id> *result) {
                   resolve(result);
                 }
                  reject:^(NSString *code, NSString *message, NSError *error) {
                    reject(code, message, error);
                  }];
}

- (void)findContacts:(NSString *)query
               limit:(double)limit
              offset:(double)offset
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject {
  [[ReactNativeMcpContactsImpl shared]
      findContacts:query
              limit:limit
             offset:offset
            resolve:^(NSArray<NSDictionary<NSString *, id> *> *contacts) {
              resolve(contacts);
            }
             reject:^(NSString *code, NSString *message, NSError *error) {
               reject(code, message, error);
             }];
}

- (void)addContact:(NSString *)givenName
        familyName:(NSString *)familyName
      organization:(NSString *)organization
      phoneNumbers:(NSArray *)phoneNumbers
            emails:(NSArray *)emails
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject {
  [[ReactNativeMcpContactsImpl shared]
      addContact:givenName
        familyName:familyName
      organization:organization
      phoneNumbers:phoneNumbers
            emails:emails
           resolve:^(NSDictionary<NSString *, id> *result) {
             resolve(result);
           }
            reject:^(NSString *code, NSString *message, NSError *error) {
              reject(code, message, error);
            }];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeContactsSpecJSI>(params);
}

+ (NSString *)moduleName {
  return @"Contacts";
}

@end
