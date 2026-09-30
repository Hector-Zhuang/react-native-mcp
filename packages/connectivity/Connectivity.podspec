require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "Connectivity"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  ios_deployment_target = defined?(min_ios_version_supported) ? min_ios_version_supported : "15.0"
  s.platforms    = { :ios => ios_deployment_target }
  s.source       = { :git => "https://github.com/Hector-Zhuang/react-native-mcp.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.private_header_files = "ios/**/*.h"
  s.frameworks = "AVFoundation"

  install_modules_dependencies(s)
end
