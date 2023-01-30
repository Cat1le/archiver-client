import { AddToDriveOutlined, Close } from '@mui/icons-material'
import { Box, Button, CircularProgress, IconButton, LinearProgress, List, ListItem, Paper, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'

export default function App() {
  /** @type {[File[], React.Dispatch<React.SetStateAction<File[]>>]} */
  const [zipping, setZipping] = useState(false)
  const [progress, setProgress] = useState(0)
  const [id, setId] = useState()
  const [files, setFiles] = useState([])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async x => {
      const newFiles = files.concat(x
        .filter(file => canAddFile(file.name))
        .map(file => ({ file, ready: false, abort: new AbortController() }))
      )
      setFiles(newFiles)
      newFiles.map(async ({ file, abort }) => {
        const body = new FormData()
        body.append('file', file)
        try {
          await fetch('http://localhost:8080/upload/' + id, {
            method: 'POST',
            body,
            signal: abort.signal
          })
          setFiles(files => files.map(f => {
            if (f.file.name === file.name) {
              return ({ file, ready: true, abort })
            } else {
              return f
            }
          }))
        } catch (e) {
          setFiles(files => files.filter(f => f.file.name !== file.name))
        }
      })
    }
  })

  useEffect(() => {
    fetch('http://localhost:8080/begin')
      .then(i => i.text())
      .then(setId)
  }, [])

  async function deleteFile(filename) {
    const file = files.find(file => file.file.name === filename)
    file.abort.abort()
    setFiles(files => files.filter(file => file.file.name !== filename))
    await fetch('http://localhost:8080/delete/' + id + '/' + filename)
  }

  function canAddFile(filename) {
    return !files.some(file => file.file.name === filename)
  }

  async function beginZip() {
    setZipping(true)
    while (progress !== 100) {
      const resp = await fetch('http://localhost:8080/zip/' + id)
      const json = await resp.json()
      setProgress(json.progress)
      if (json.progress === 100) {
        document.getElementById('download_frame').src = 'http://localhost:8080/download/' + id
        setZipping(false)
        setProgress(0)
        return
      }
    }
  }

  return <Box
    display='flex'
    justifyContent='center'
    alignItems='center'
    flexDirection='column'
    gap={3}
    height='100vh'
  >
    <iframe title='download_frame' id='download_frame' style={{ display: 'none' }} />
    {files.length
      ? (
        <>
          <Typography fontSize={24}>
            Файлы
          </Typography>
          <List style={{ width: '500px', height: '50%', backgroundColor: 'lightgrey', borderRadius: '10px' }}>
            {
              files.map((value, index) => (
                <ListItem key={index} style={{
                  margin: '5px 0',
                  backgroundColor: 'white',
                  display: 'flex',
                  justifyContent: 'space-between',
                  position: 'relative'
                }}>
                  <Typography fontSize={16}>{value.file.name}</Typography>
                  {value.ready ? null : <CircularProgress style={{ position: 'absolute', right: 16 }} />}
                  <IconButton disabled={zipping} onClick={() => deleteFile(value.file.name)}>
                    <Close />
                  </IconButton>
                </ListItem>
              ))
            }
          </List>
          <Box style={{ width: '500px' }} display='flex' flexDirection='row' justifyContent='space-between'>
            <Button variant='contained' disabled={zipping} onClick={() => beginZip()}>Архивировать</Button>
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              <Button variant='outlined' disabled={zipping}>Добавить файл</Button>
            </div>
            <Button variant='outlined' color='error' onClick={() => setFiles(files => files.map(x =>deleteFile(x.file.name)))} disabled={zipping}>Очистить</Button>
          </Box>
          {zipping ? <LinearProgress variant='determinate' value={progress} style={{ width: '100%', position: 'absolute', bottom: '10px' }} /> : null}
        </>
      )
      : (
        <>
          <Typography fontSize={18}>
            Чтобы начать, перетащите сюда по меньшей мере один файл
          </Typography>
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <Paper variant='outlined' style={{ height: '100px', width: '250px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {
                isDragActive
                  ? <AddToDriveOutlined style={{ height: '75px', width: '75px', color: canAddFile() ? 'green' : 'red' }} />
                  : <AddToDriveOutlined style={{ height: '75px', width: '75px' }} />
              }
            </Paper>
          </div>
          <div />
        </>
      )
    }
  </Box>
}
