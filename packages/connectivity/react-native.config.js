module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import com.reactnativemcp.connectivity.ConnectivityPackage;',
        packageInstance: 'new ConnectivityPackage()',
      },
    },
  },
};
