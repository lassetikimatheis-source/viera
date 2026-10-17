// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "VYRANativeCore",
    platforms: [.macOS(.v13), .iOS(.v17)],
    products: [.library(name: "VYRANativeCore", targets: ["VYRANativeCore"])],
    targets: [
        .target(name: "VYRANativeCore", path: "VYRA/WHOOP", exclude: ["WHOOPKeychain.swift", "WHOOPAuthorization.swift", "NativeHealthStore.swift", "WHOOPViews.swift"], sources: ["WHOOPCore.swift", "WHOOPClient.swift", "NativeHealthKitMapper.swift"]),
        .testTarget(name: "VYRANativeCoreTests", dependencies: ["VYRANativeCore"], path: "Tests/VYRANativeCoreTests")
    ]
)
