
var NanumMyeongjoBold = "BASE64_ENCODED_FONT_DATA_BOLD_HERE";
if (typeof jsPDF !== "undefined") {
  jsPDF.API.events.push(["addFonts", function() {
    this.addFileToVFS("NanumMyeongjoBold.ttf", NanumMyeongjoBold);
    this.addFont("NanumMyeongjoBold.ttf", "NanumMyeongjo", "bold");
  }]);
}
