import React, { useState, useRef } from 'react'
import { useUploader } from '@w3ui/react-uploader'
import { useUploadsList } from '@w3ui/react-uploads-list'
import { withIdentity } from './components/Authenticator'
import { Camera } from 'react-camera-pro'
import './spinner.css'
import './app.css'

function dataURLtoFile (dataurl) {
  const arr = dataurl.split(',')
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  const blob = new Blob([u8arr], { type: mime })
  return new File([blob], 'camera-image')
}

export function ContentPage () {
  const [, uploader] = useUploader()
  const [status, setStatus] = useState('')
  const [error, setError] = useState(null)
  const [images, setImages] = useState([])
  const camera = useRef(null)
  // eslint-disable-next-line no-unused-vars
  const {loading, error: listError, data: listData, reload: listReload} = useUploadsList();

  if (!uploader) return null

  const takePhoto = async (e) => {
    e.preventDefault()
    const imgdata = camera.current.takePhoto()
    try {
      // Build a DAG from the file data to obtain the root CID.
      setStatus('encoding')
      const theFile = dataURLtoFile(imgdata)
      setStatus('uploading')
      const cid = await uploader.uploadFile(theFile)
      setImages([{ cid: cid, data: imgdata }, ...images])
    } catch (err) {
      console.error(err)
      setError(err)
    } finally {
      setStatus('done')
    }
  }

  const printStatus = status === 'done' && error ? error : status
  const printListData = (listData && listData.results) || []

  return (
    <div>
       <p>
         <button onClick={takePhoto}>Take photo</button> {printStatus}
       </p>
       <Camera ref={camera} />
       <ul className='images'>
        {images.map(({ cid, data }) => (
          <ImageListItem key={cid} cid={cid} data={data} />
        ))}
        {printListData.map(({dataCid: cid}) => (
          <ImageListItem key={cid} cid={cid} />
        ))}
       </ul>
     </div>
  )
}

function ImageListItem ({ cid, data }) {
  if (/bagb/.test(`${cid}`)) {
    return <li key={cid}>CAR cid: {cid}</li>
  }
  const imgUrl = `https://w3s.link/ipfs/${cid}`
  const imgSrc = data || imgUrl
  return (
    <li key={cid}>
      <a href={imgUrl}>
        <img width="200px" alt='camera output' src={imgSrc} />
      </a>
    </li>
  )
}

export default withIdentity(ContentPage)
