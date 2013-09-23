var profile = (function () {
  function isTest(filename, mid) {
    return filename.indexOf("test/") >= 0;
  }

  function isCopyOnly(filename, mid) {
    return filename.indexOf(".html") >= 0;
  }

  function isAmd(filename, mid) {
    return filename.indexOf(".json") < 0 && filename.indexOf(".js") >= 0 && filename.indexOf(".profile.js") < 0;
  }

  return {
    resourceTags: {
      test: function (filename, mid) {
        return isTest(filename, mid);
      },

      copyOnly: function (filename, mid) {
        return isCopyOnly(filename, mid);
      },

      amd: function (filename, mid) {
        return !isTest(filename, mid) && !isCopyOnly(filename, mid) && isAmd(filename, mid);
      }
    }
  };
})();
