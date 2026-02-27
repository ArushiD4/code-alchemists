const video = document.getElementById("video")
const canvas = document.getElementById("canvas")
const output = document.getElementById("output")
const sizeInfo = document.getElementById("sizeInfo")

const startBtn = document.getElementById("startCamera")
const captureBtn = document.getElementById("capture")

let stream = null

// Start Camera
startBtn.onclick = async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    })
    video.srcObject = stream
  } catch (err) {
    alert("Camera access denied")
  }
}

// Compress function (< 100KB)
function compressToUnder100KB(canvas, callback) {
  const MAX_SIZE = 100 * 1024
  let quality = 0.9

  function compress() {
    const dataURL = canvas.toDataURL("image/jpeg", quality)
    const size = Math.round((dataURL.length * 3) / 4)

    if (size <= MAX_SIZE || quality <= 0.1) {
      callback(dataURL, size)
    } else {
      quality -= 0.05
      compress()
    }
  }

  compress()
}

// Capture Frame
captureBtn.onclick = () => {
  const ctx = canvas.getContext("2d")

  let width = video.videoWidth
  let height = video.videoHeight

  // Optional resize for better compression
  const MAX_WIDTH = 640
  if (width > MAX_WIDTH) {
    const scale = MAX_WIDTH / width
    width *= scale
    height *= scale
  }

  canvas.width = width
  canvas.height = height

  ctx.drawImage(video, 0, 0, width, height)

  compressToUnder100KB(canvas, (compressedImage, size) => {
    output.src = compressedImage
    sizeInfo.innerText = `Final Image Size: ${(size / 1024).toFixed(2)} KB`
  })
}