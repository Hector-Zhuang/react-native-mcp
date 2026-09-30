import UIKit
import CoreLocation
import React

private final class ReactNativeMcpLocationDelegate: NSObject, CLLocationManagerDelegate {
  weak var owner: ReactNativeMcpLocationImpl?

  init(owner: ReactNativeMcpLocationImpl) {
    self.owner = owner
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    owner?.locationManagerDidChangeAuthorization(manager)
  }

  func locationManager(
    _ manager: CLLocationManager,
    didUpdateLocations locations: [CLLocation]
  ) {
    owner?.locationManager(manager, didUpdateLocations: locations)
  }

  func locationManager(
    _ manager: CLLocationManager,
    didFailWithError error: Error
  ) {
    owner?.locationManager(manager, didFailWithError: error)
  }
}

@objc(ReactNativeMcpLocationImpl)
public class ReactNativeMcpLocationImpl: NSObject {
  @objc public static let shared = ReactNativeMcpLocationImpl()

  
  private static let permissionDeniedCode = "PERMISSION_DENIED"
  private static let unavailableCode = "UNAVAILABLE"
  private static let locationFailedCode = "LOCATION_FAILED"

  
  private var locationManager: CLLocationManager?
  private var locationDelegate: ReactNativeMcpLocationDelegate?

  private var permissionResolve: RCTPromiseResolveBlock?
  private var permissionReject: RCTPromiseRejectBlock?

  private var positionResolve: RCTPromiseResolveBlock?
  private var positionReject: RCTPromiseRejectBlock?
  private var positionFinished = false
  private var timeoutTimer: Timer?

  

  @objc public func requestPermission(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      let manager = self.ensureLocationManager()
      switch manager.authorizationStatus {
      case .authorizedWhenInUse, .authorizedAlways:
        resolve(Self.permissionPayload(granted: true, status: "granted"))
      case .denied:
        resolve(Self.permissionPayload(granted: false, status: "denied"))
      case .restricted:
        resolve(Self.permissionPayload(granted: false, status: "restricted"))
      case .notDetermined:
        
        
        self.permissionResolve = resolve
        self.permissionReject = reject
        manager.requestWhenInUseAuthorization()
      @unknown default:
        resolve(Self.permissionPayload(granted: false, status: "unavailable"))
      }
    }
  }

  public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    guard let resolve = permissionResolve else {
      return
    }

    let payload: [String: Any]
    switch manager.authorizationStatus {
    case .authorizedWhenInUse, .authorizedAlways:
      payload = Self.permissionPayload(granted: true, status: "granted")
    case .denied:
      payload = Self.permissionPayload(granted: false, status: "denied")
    case .restricted:
      payload = Self.permissionPayload(granted: false, status: "restricted")
    case .notDetermined:
      
      return
    @unknown default:
      payload = Self.permissionPayload(granted: false, status: "unavailable")
    }

    permissionResolve = nil
    permissionReject = nil
    resolve(payload)
  }

  

  @objc public func getCurrentPosition(
    _ accuracy: String,
    timeoutMs: Double,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      let manager = self.ensureLocationManager()

      switch manager.authorizationStatus {
      case .authorizedWhenInUse, .authorizedAlways:
        break
      case .denied, .restricted:
        reject(
          Self.permissionDeniedCode,
          "Location permission has not been granted.",
          nil
        )
        return
      case .notDetermined:
        reject(
          Self.permissionDeniedCode,
          "Location permission has not been requested yet.",
          nil
        )
        return
      @unknown default:
        reject(
          Self.unavailableCode,
          "Location services are unavailable on this device.",
          nil
        )
        return
      }

      
      if self.positionResolve != nil {
        self.finishPositionFailure(
          code: Self.locationFailedCode,
          message: "A new location request was started."
        )
      }

      switch accuracy {
      case "best":
        manager.desiredAccuracy = kCLLocationAccuracyBest
      case "low":
        manager.desiredAccuracy = kCLLocationAccuracyThreeKilometers
      default:
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
      }

      self.positionResolve = resolve
      self.positionReject = reject
      self.positionFinished = false

      
      manager.requestLocation()

      self.timeoutTimer?.invalidate()
      self.timeoutTimer = Timer.scheduledTimer(
        withTimeInterval: timeoutMs / 1000.0,
        repeats: false
      ) { [weak self] _ in
        self?.finishPositionFailure(
          code: Self.locationFailedCode,
          message: "Location request timed out."
        )
      }
    }
  }

  public func locationManager(
    _ manager: CLLocationManager,
    didUpdateLocations locations: [CLLocation]
  ) {
    guard positionResolve != nil, !positionFinished, let location = locations.last else {
      return
    }
    finishPositionSuccess(location)
  }

  public func locationManager(
    _ manager: CLLocationManager,
    didFailWithError error: Error
  ) {
    guard positionResolve != nil else {
      return
    }

    let nsError = error as NSError
    if nsError.domain == kCLErrorDomain {
      switch nsError.code {
      case CLError.denied.rawValue:
        finishPositionFailure(
          code: Self.permissionDeniedCode,
          message: "Location permission was denied."
        )
        return
      case CLError.locationUnknown.rawValue:
        finishPositionFailure(
          code: Self.locationFailedCode,
          message: "The device location could not be determined."
        )
        return
      default:
        break
      }
    }

    finishPositionFailure(
      code: Self.locationFailedCode,
      message: error.localizedDescription
    )
  }

  

  private func ensureLocationManager() -> CLLocationManager {
    if let manager = locationManager {
      return manager
    }
    let manager = CLLocationManager()
    let delegate = ReactNativeMcpLocationDelegate(owner: self)
    manager.delegate = delegate
    locationDelegate = delegate
    manager.pausesLocationUpdatesAutomatically = false
    locationManager = manager
    return manager
  }

  private func finishPositionSuccess(_ location: CLLocation) {
    guard !positionFinished else {
      return
    }
    positionFinished = true
    timeoutTimer?.invalidate()
    timeoutTimer = nil

    let coordinate = location.coordinate
    let payload: [String: Any] = [
      "latitude": coordinate.latitude,
      "longitude": coordinate.longitude,
      "accuracy": location.horizontalAccuracy >= 0 ? location.horizontalAccuracy : -1,
      "altitude": location.altitude,
      "altitudeAccuracy": location.verticalAccuracy >= 0 ? location.verticalAccuracy : -1,
      "heading": location.course >= 0 ? location.course : -1,
      "speed": location.speed >= 0 ? location.speed : -1,
      "timestamp": location.timestamp.timeIntervalSince1970 * 1000,
    ]

    let resolve = positionResolve
    positionResolve = nil
    positionReject = nil
    resolve?(payload)
  }

  private func finishPositionFailure(code: String, message: String) {
    guard !positionFinished else {
      return
    }
    positionFinished = true
    timeoutTimer?.invalidate()
    timeoutTimer = nil
    locationManager?.stopUpdatingLocation()

    let reject = positionReject
    positionResolve = nil
    positionReject = nil
    reject?(code, message, nil)
  }

  private static func permissionPayload(granted: Bool, status: String) -> [String: Any] {
    return [
      "granted": granted,
      "status": status,
    ]
  }
}
