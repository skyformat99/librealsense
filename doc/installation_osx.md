# Mac OS Installation  

**Note:** OSX support for the full range of functionality offered by the SDK is not yet complete. If you need support for R200 or the SR300, [legacy librealsense](https://github.com/IntelRealSense/librealsense/tree/legacy) offers a subset of SDK functionality. 

## Building from Source

1. Install XCode 6.0+ via the AppStore
2. Install the Homebrew package manager via terminal - [link](http://brew.sh/)
3. Install the following packages via brew:
  * `brew install libusb pkg-config`
  * `brew install homebrew/versions/glfw3`
  * `brew install cmake`
4. Generate XCode project:
  * `mkdir build && cd build`
  * `cmake .. -DBUILD_EXAMPLES=true -DBUILD_WITH_OPENMP=false -DHWM_OVER_XU=false -G Xcode`
5. Open and build the XCode project
