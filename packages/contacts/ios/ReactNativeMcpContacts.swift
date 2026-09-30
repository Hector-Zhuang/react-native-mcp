import Foundation
import Contacts

@objc(ReactNativeMcpContactsImpl)
public class ReactNativeMcpContactsImpl: NSObject {
  @objc public static let shared = ReactNativeMcpContactsImpl()

  private let store = CNContactStore()

  

  
  
  @objc(requestPermission:resolve:reject:)
  public func requestPermission(
    _ writeAccess: Bool,
    resolve: @escaping ([String: Any]) -> Void,
    reject: @escaping (String, String, Error?) -> Void
  ) {
    switch CNContactStore.authorizationStatus(for: .contacts) {
    case .authorized:
      resolve(["granted": true, "status": "granted"])
    case .denied:
      resolve(["granted": false, "status": "denied"])
    case .restricted:
      resolve(["granted": false, "status": "restricted"])
    case .notDetermined:
        store.requestAccess(for: .contacts) { granted, error in
        if let error = error {
          reject(Self.errorCode(error), error.localizedDescription, error)
          return
        }
        resolve([
          "granted": granted,
          "status": granted ? "granted" : "denied",
        ])
      }
    @unknown default:
      resolve(["granted": false, "status": "unavailable"])
    }
  }

  

  @objc(findContacts:limit:offset:resolve:reject:)
  public func findContacts(
    _ query: String?,
    limit: Double,
    offset: Double,
    resolve: @escaping ([[String: Any]]) -> Void,
    reject: @escaping (String, String, Error?) -> Void
  ) {
    let keys: [CNKeyDescriptor] = [
      CNContactIdentifierKey as CNKeyDescriptor,
      CNContactGivenNameKey as CNKeyDescriptor,
      CNContactFamilyNameKey as CNKeyDescriptor,
      CNContactOrganizationNameKey as CNKeyDescriptor,
      CNContactPhoneNumbersKey as CNKeyDescriptor,
      CNContactEmailAddressesKey as CNKeyDescriptor,
    ]

    var matched: [CNContact] = []
    do {
      if let query = query, !query.isEmpty {
        let predicate = CNContact.predicateForContacts(matchingName: query)
        matched = try store.unifiedContacts(matching: predicate, keysToFetch: keys)
      } else {
        let request = CNContactFetchRequest(keysToFetch: keys)
        try store.enumerateContacts(with: request) { contact, _ in
          matched.append(contact)
        }
      }
    } catch {
      reject(Self.errorCode(error), error.localizedDescription, error)
      return
    }

    let sorted = matched.sorted {
      Self.displayName(for: $0).localizedCaseInsensitiveCompare(Self.displayName(for: $1))
        == .orderedAscending
    }

    let start = min(max(0, Int(offset)), sorted.count)
    let end = min(start + max(0, Int(limit)), sorted.count)
    let page = Array(sorted[start..<end])
    resolve(page.map { Self.serialize($0) })
  }

  

  @objc(addContact:familyName:organization:phoneNumbers:emails:resolve:reject:)
  public func addContact(
    _ givenName: String?,
    familyName: String?,
    organization: String?,
    phoneNumbers: [[String: Any]],
    emails: [[String: Any]],
    resolve: @escaping ([String: Any]) -> Void,
    reject: @escaping (String, String, Error?) -> Void
  ) {
    let contact = CNMutableContact()
    contact.givenName = givenName ?? ""
    contact.familyName = familyName ?? ""
    if let organization = organization, !organization.isEmpty {
      contact.organizationName = organization
    }

    contact.phoneNumbers = phoneNumbers.map { item in
      let number = (item["number"] as? String) ?? ""
      let label = Self.customLabel(item["label"]) ?? CNLabelPhoneNumberMain
      return CNLabeledValue(label: label, value: CNPhoneNumber(stringValue: number))
    }

    contact.emailAddresses = emails.map { item in
      let address = (item["address"] as? String) ?? ""
      let label = Self.customLabel(item["label"]) ?? CNLabelWork
      return CNLabeledValue(label: label, value: address as NSString)
    }

    let saveRequest = CNSaveRequest()
    saveRequest.add(contact, toContainerWithIdentifier: nil)

    do {
      try store.execute(saveRequest)
      resolve(["id": contact.identifier])
    } catch {
      reject(Self.errorCode(error), error.localizedDescription, error)
    }
  }

  

  private static func errorCode(_ error: Error) -> String {
    let nsError = error as NSError
    if nsError.domain == CNErrorDomain
      && nsError.code == CNError.authorizationDenied.rawValue
    {
      return "PERMISSION_DENIED"
    }
    return "CONTACTS_FAILED"
  }

  private static func customLabel(_ value: Any?) -> String? {
    guard let label = value as? String, !label.isEmpty else {
      return nil
    }
    return label
  }

  private static func displayName(for contact: CNContact) -> String {
    if let formatted = CNContactFormatter.string(from: contact, style: .fullName),
      !formatted.isEmpty
    {
      return formatted
    }
    return [contact.givenName, contact.familyName]
      .filter { !$0.isEmpty }
      .joined(separator: " ")
  }

  private static func localizedLabel(_ label: String?) -> String {
    guard let label = label, !label.isEmpty else {
      return ""
    }
    let localized = CNLabeledValue<CNPhoneNumber>.localizedString(forLabel: label)
    return localized.isEmpty ? label : localized
  }

  private static func serialize(_ contact: CNContact) -> [String: Any] {
    var phones: [[String: Any]] = []
    var seenNumbers = Set<String>()
    for labeledValue in contact.phoneNumbers {
      let number = labeledValue.value.stringValue
      if seenNumbers.contains(number) {
        continue
      }
      seenNumbers.insert(number)
      phones.append([
        "label": localizedLabel(labeledValue.label),
        "number": number,
      ])
    }

    var emails: [[String: Any]] = []
    var seenAddresses = Set<String>()
    for labeledValue in contact.emailAddresses {
      let address = labeledValue.value as String
      if seenAddresses.contains(address) {
        continue
      }
      seenAddresses.insert(address)
      emails.append([
        "label": localizedLabel(labeledValue.label),
        "address": address,
      ])
    }

    return [
      "id": contact.identifier,
      "givenName": contact.givenName.isEmpty ? NSNull() : contact.givenName as Any,
      "familyName": contact.familyName.isEmpty ? NSNull() : contact.familyName as Any,
      "displayName": displayName(for: contact),
      "phoneNumbers": phones,
      "emails": emails,
    ]
  }
}
