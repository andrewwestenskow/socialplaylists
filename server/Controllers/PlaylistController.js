const {REACT_APP_YOUTUBE_API_KEY} = process.env
const axios = require('axios')

module.exports = {
  addToPlaylist: async (req, res) => {
    const db = req.app.get('db')
    const { group_id, songUrl: url } = req.body

    let songId

    try {
      let checkSong = await db.checkSong([url])
      if (checkSong.length === 0) {
        songId = await db.addSong([url])
      } else {
        songId = checkSong
      }
      let searchId = songId[0].song_id
      let checkPlay = await db.checkPlaylist({group_id, searchId})
      if(checkPlay.length === 0){

        await db.addToPlaylist([group_id, songId[0].song_id])
  
        let playlist = await db.getPlaylist([group_id])
  
        res.status(200).send(playlist)
      } else {
        return res.status(200).send(`Song already on playlist`)
      }


    } catch (error) {
      res.status(500).send(`Could not add song`)
    }


  },

  getPlaylist: async (req, res) => {
    const db = req.app.get('db')
    const { group_id } = req.body
    try {
      let playlist = await db.getPlaylist([group_id])
      //EXTRACTS YOUTUBE ID FROM URL
      function YouTubeGetID(url){
        var ID = '';
        url = url.replace(/(>|<)/gi,'').split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
        if(url[2] !== undefined) {
          ID = url[2].split(/[^0-9a-z_\-]/i);
          ID = ID[0];
        }
        else {
          ID = url;
        }
          return ID;
      }
      playlist.forEach(song => {
        song.id = YouTubeGetID(song.url)
      })

      let currentPlaylist = playlist.sort((a, b) => {
        const scoreA = a.score
        const scoreB = b.score
        if (scoreA < scoreB) {
          return 1
        } else {
          return -1
        }
      })

      //HANDLES PREVIOUSLY PLAYED

      let prevList = await db.getPreviouslyPlayed([group_id])
      
      //EXTRACTS YOUTUBE ID FROM URL
      function YouTubeGetID(url){
        var ID = '';
        url = url.replace(/(>|<)/gi,'').split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
        if(url[2] !== undefined) {
          ID = url[2].split(/[^0-9a-z_\-]/i);
          ID = ID[0];
        }
        else {
          ID = url;
        }
          return ID;
      }
      prevList.forEach(song => {
        song.id = YouTubeGetID(song.url)
      })

      //GETS VIDEO INFO FROM IDS IDS

      let videoIds1 = currentPlaylist.map(video => {
        return video.id
      })
  
      let videoIds2 = prevList.map(video => {
        return video.id
      })
  
      let videoIds = [...videoIds1, ...videoIds2]
  
  
      let searchString = videoIds.join('%2C')
  
      let videoData = await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${searchString}&key=${REACT_APP_YOUTUBE_API_KEY}`)
  
      currentPlaylist.forEach(video => {
        let details = videoData.data.items.find(element => element.id === video.id)
        video.details = details
      })
  
      prevList.forEach(video => {
        let details = videoData.data.items.find(element => element.id === video.id)
        video.details = details
      })
  
      let nowPlaying = currentPlaylist.splice(0, 1)


      res.status(200).send({currentPlaylist, prevList, nowPlaying})
    } catch (error) {
      res.sendStatus(500)
    }

  },

  vote: async (req, res) => {
    const db = req.app.get('db')
    const { playlistId, vote } = req.body

    try {
      let scores = await db.getScore(playlistId)
      if(scores.length === 0){
        //ACCOUNTS FOR LIST RERENDER AFTER ITEM HAS CHANGED LISTS
        return res.sendStatus(200)
      }

      let score = scores[0].score

      if (vote === 1) {
        score++
      } else if (vote === 0) {
        score--
      } else {
        score = vote
      }

      let newScore = await db.vote([score, playlistId])

      res.status(200).send(newScore[0])
    } catch (err) {
      
      res.sendStatus(500)
    }
  },

  resetVote: async (req, res) => {
    const db = req.app.get('db')
    const { playlistId, group_id, song_id } = req.body

    try {
      let previouslyPlayed = await db.getPreviouslyPlayed([group_id])

      let alreadyExists = previouslyPlayed.some(element => element.song_id === song_id)

      if(alreadyExists){
        await db.deleteSong([playlistId])
        res.status(200).send(previouslyPlayed)
      } else {

        let newPrev = await db.nextSong([playlistId, group_id, song_id])
  
        res.status(200).send(newPrev)
      }
      
    } catch (err) {
      res.sendStatus(500)
    }
  },

  delete: async (req, res) => {
    const db = req.app.get('db')
    const {playlistId: id} = req.params

    try {
      await db.deleteSong([id])
      res.sendStatus(200)
    } catch (error) {
      res.sendStatus(500)
    }
  },

  deleteSong: async (req, res) => {
    const db = req.app.get('db')
    const {song_id: id} = req.params

    try {
      await db.deleteFromSong([id])
      res.sendStatus(200)
    } catch (error) {
      res.sendStatus(500)
    }
  },

  getPreviouslyPlayed: async (req,res) => {
    const db = req.app.get('db')
    const {group_id} = req.body

    try {
      let prevList = await db.getPreviouslyPlayed([group_id])
      
      //EXTRACTS YOUTUBE ID FROM URL
      function YouTubeGetID(url){
        var ID = '';
        url = url.replace(/(>|<)/gi,'').split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
        if(url[2] !== undefined) {
          ID = url[2].split(/[^0-9a-z_\-]/i);
          ID = ID[0];
        }
        else {
          ID = url;
        }
          return ID;
      }
      prevList.forEach(song => {
        song.id = YouTubeGetID(song.url)
      })
      res.status(200).send(list)
    } catch (error) {
      res.sendStatus(500)
    }
  },

  deletePrev: async (req, res) => {
    const db = req.app.get('db')

    try {
      const {previouslyPlayedId: id} = req.params
      await db.deleteOldSong([id])
      res.sendStatus(200)
      
    } catch (error) {
      res.sendStatus(500)
    }
  },

  addBack: async (req, res) => {
    const db = req.app.get('db')
    const {previously_played_id, group_id, song_id} = req.body
    await db.addSongBack([previously_played_id, group_id, song_id])
    res.sendStatus(200)
  }
}