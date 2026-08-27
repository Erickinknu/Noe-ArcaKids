package com.arcakids.child

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ParentalUsagePackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(ParentalUsageModule(reactContext), DeviceOwnerModule(reactContext))

  @Deprecated(
    "Deprecated in Java",
    ReplaceWith("createViewManagers(reactContext)")
  )
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
