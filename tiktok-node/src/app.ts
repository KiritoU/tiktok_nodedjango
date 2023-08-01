import express from "express";
const bodyParser = require("body-parser");
import { TTScraper } from "./BL";
import { IVideo } from "./Interfaces";
import { fetchVideoNoWaterMark, fetchVideo, fetchUser } from "./main";

const TikTokScraper = new TTScraper();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const port = 3000;

const getFirstPageVideosFromUser = async (
  username: string,
  isGetAllVideos: boolean = true
) => {
  const fetchVideos = await TikTokScraper.getAllVideosFromUser(
    username,
    isGetAllVideos
  ); // second argument set to true to fetch the video without watermark
  const videoUrls = fetchVideos.map((video: IVideo) => video.directVideoUrl);

  return videoUrls;
};

const getUserVideoByCursor = async (username: string, cursor: string = "") => {
  console.log("Fetching...");
  const fetchVideos = await TikTokScraper.getAllVideosFromUserWithCursor(
    username,
    cursor
  ); // second argument set to true to fetch the video without watermark
  const { videos, newCursor, isHasMore } = fetchVideos;
  //   console.log(videos);
  //   console.log(newCursor);
  //   console.log(isHasMore);
  //   const videoUrls = videos.map((video: IVideo) => video.directVideoUrl);

  return { videos, newCursor, isHasMore };
};

app.post("", async (req, res) => {
  const username = req.body.username;
  const cursor = req.body.cursor;
  await getUserVideoByCursor(username, cursor)
    .then(({ videos, newCursor, isHasMore }) => {
      //   console.log(videoUrls);
      res.json({ videos, newCursor, isHasMore });
    })
    .catch((err) => {
      //   console.log(err);
      res.json({ error: err });
    });
});

app.post("/video", async (req, res) => {
  const reqUrl = req.body.url;
  await fetchVideo(reqUrl, true)
    .then((video) => res.json({ data: video }))
    .catch((err) => res.json({ error: err }));
});

app.post("/user", async (req, res) => {
  const username = req.body.username;
  await fetchUser(username)
    .then((user) => res.json({ data: user }))
    .catch((err) => res.json({ error: err }));
});

https: app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});
