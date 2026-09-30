import UIKit
import React

@objc(ReactNativeMcpShareImpl)
public class ReactNativeMcpShareImpl: NSObject {
  @objc public static let shared = ReactNativeMcpShareImpl()

  private static let fileScheme = "file://"

  @objc public func share(
    _ text: String?,
    url: String?,
    imageUri: String?,
    subject: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    var activityItems: [Any] = []

    if let text = text, !text.isEmpty {
      activityItems.append(text)
    }

    if let urlString = url, !urlString.isEmpty {
      if urlString.hasPrefix(Self.fileScheme) {
        let path = String(urlString.dropFirst(Self.fileScheme.count))
        activityItems.append(URL(fileURLWithPath: path))
      } else if let parsed = URL(string: urlString),
                let scheme = parsed.scheme?.lowercased(),
                scheme == "http" || scheme == "https" {
        activityItems.append(parsed)
      }
    }

    if let imagePathValue = imageUri, !imagePathValue.isEmpty {
      let path = imagePathValue.hasPrefix(Self.fileScheme)
        ? String(imagePathValue.dropFirst(Self.fileScheme.count))
        : imagePathValue
      guard let image = UIImage(contentsOfFile: path) else {
        reject(
          "UNAVAILABLE",
          "Share is not available: the image could not be loaded.",
          nil
        )
        return
      }
      activityItems.append(image)
    }

    let subjectValue = subject?.isEmpty == false ? subject : nil

    
    if activityItems.isEmpty, let fallbackText = subjectValue {
      activityItems.append(fallbackText)
    }

    DispatchQueue.main.async {
      guard !activityItems.isEmpty else {
        reject(
          "INVALID_PARAMS",
          "At least one of text, url, imageUri or subject is required.",
          nil
        )
        return
      }

      let controller = UIActivityViewController(
        activityItems: activityItems,
        applicationActivities: nil
      )
      if let subjectValue = subjectValue {
        controller.setValue(subjectValue, forKey: "subject")
      }

      let keyWindow = Self.keyWindow()
      if let popover = controller.popoverPresentationController {
        popover.sourceView = keyWindow
        if let bounds = keyWindow?.bounds {
          popover.sourceRect = CGRect(
            x: bounds.midX,
            y: bounds.midY,
            width: 0,
            height: 0
          )
        }
        popover.permittedArrowDirections = .any
      }

      guard let presenter = Self.topmostViewController() else {
        reject(
          "UNAVAILABLE",
          "Share is not available: no view controller is available to present the share sheet.",
          nil
        )
        return
      }

      controller.completionWithItemsHandler = { activityType, _, _, _ in
        if activityType != nil {
          resolve(["status": "shared"])
        } else {
          resolve(["status": "dismissed"])
        }
      }

      presenter.present(controller, animated: true)
    }
  }

  

  private static func keyWindow() -> UIWindow? {
    return UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
      .first { $0.isKeyWindow }
  }

  private static func topmostViewController(
    _ base: UIViewController? = keyWindow()?.rootViewController
  ) -> UIViewController? {
    guard let base = base else {
      return nil
    }
    var top = base
    while let presented = top.presentedViewController {
      top = presented
    }
    return top
  }
}
