
var NanumMyeongjoExtraBold = "BASE64_ENCODED_FONT_DATA_EXTRA_BOLD_HERE";
if (typeof jsPDF !== "undefined") {
  jsPDF.API.events.push(["addFonts", function() {
    this.addFileToVFS("NanumMyeongjoExtraBold.ttf", NanumMyeongjoExtraBold);
    this.addFont("NanumMyeongjoExtraBold.ttf", "NanumMyeongjo", "extra-bold");
  }]);
}
