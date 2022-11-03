import React, { useState, useRef, useEffect } from 'react'
import { useUploader } from '@w3ui/react-uploader'
import { useUploadsList } from '@w3ui/react-uploads-list'
import { withIdentity } from './components/Authenticator'
import { Camera } from 'react-camera-pro'
import * as Name from 'w3name';
import { base64pad } from 'multiformats/bases/base64'

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
  const [xname, setName] = useState(null)
  const [w3Rev, setw3Rev] = useState(null)
  const camera = useRef(null)
  // eslint-disable-next-line no-unused-vars
  const {loading, error: listError, data: listData, reload: listReload} = useUploadsList();

  useEffect(() => {
    // const name = loadDefaultw3name()
    if (xname) return;
    const maybeKeyBytes = localStorage.getItem("__app.w3name.key");
    if (maybeKeyBytes) {
      Name.from(base64pad.decode(maybeKeyBytes)).then((w3Name) => {
        Name.resolve(w3Name).then(revision => {
          setName(w3Name);
          setw3Rev(revision)
        });
      });
    } else {
      Name.create().then((w3Name) => {
        const keyBytes = base64pad.encode(w3Name.key.bytes);
        localStorage.setItem("__app.w3name.key", keyBytes);
        const value = "/ipfs/bafybeid3u4ejpcoplzfqouud5f2hgmfyadryy6pipuhrotxy57zi3g22wy"
        Name.v0(w3Name, value).then(revision=>{
          Name.publish(revision, w3Name.key).then(() => {
            setName(w3Name)
            setw3Rev(revision)
          });
        });
      });
    }
  }, [xname]);

  async function publishLatestName(value) {
    const nextRevision = await Name.increment(w3Rev, value);
    Name.publish(nextRevision, xname.key).then((rev) => {
      setw3Rev(rev)
    })
  }

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
      await publishLatestName("/ipfs/"+cid)
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
         Channel name: <input type="text" defaultValue={xname ? xname.toString() : ""} />
       </p>
       <Camera ref={camera} />
       <ul className='images'>
       {w3Rev && w3Rev.value && <ImageListItem cid={w3Rev.value.replace('/ipfs/','')}/>}
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
