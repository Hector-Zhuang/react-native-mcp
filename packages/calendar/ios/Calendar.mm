#import "Calendar.h"
#import "Calendar-Swift.h"

@implementation Calendar

- (void)requestPermission:(BOOL)writeAccess
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject {
  [[ReactNativeMcpCalendarImpl shared]
      requestPermission:writeAccess
                 resolve:^(NSDictionary<NSString *, id> *result) {
                   resolve(result);
                 }
                  reject:^(NSString *code, NSString *message, NSError *error) {
                    reject(code, message, error);
                  }];
}

- (void)listCalendars:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject {
  [[ReactNativeMcpCalendarImpl shared]
      listCalendars:^(NSArray<NSDictionary<NSString *, id> *> *calendars) {
        resolve(calendars);
      }
             reject:^(NSString *code, NSString *message, NSError *error) {
               reject(code, message, error);
             }];
}

- (void)listEvents:(NSArray<NSString *> *)calendarIds
         startDate:(double)startDate
           endDate:(double)endDate
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject {
  [[ReactNativeMcpCalendarImpl shared]
      listEvents:calendarIds
        startDate:startDate
          endDate:endDate
          resolve:^(NSArray<NSDictionary<NSString *, id> *> *events) {
            resolve(events);
          }
           reject:^(NSString *code, NSString *message, NSError *error) {
             reject(code, message, error);
           }];
}

- (void)createEvent:(NSString *)calendarId
              title:(NSString *)title
              notes:(NSString *)notes
           location:(NSString *)location
          startDate:(double)startDate
            endDate:(double)endDate
             allDay:(BOOL)allDay
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject {
  [[ReactNativeMcpCalendarImpl shared]
      createEvent:calendarId
             title:title
             notes:notes
          location:location
         startDate:startDate
           endDate:endDate
            allDay:allDay
           resolve:^(NSDictionary<NSString *, id> *result) {
             resolve(result);
           }
            reject:^(NSString *code, NSString *message, NSError *error) {
              reject(code, message, error);
            }];
}

- (void)deleteEvent:(NSString *)eventId
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject {
  [[ReactNativeMcpCalendarImpl shared]
      deleteEvent:eventId
          resolve:^(NSDictionary<NSString *, id> *result) {
            resolve(result);
          }
           reject:^(NSString *code, NSString *message, NSError *error) {
             reject(code, message, error);
           }];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeCalendarSpecJSI>(params);
}

+ (NSString *)moduleName {
  return @"Calendar";
}

@end
