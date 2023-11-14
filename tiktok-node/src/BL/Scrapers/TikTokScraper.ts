import * as cheerio from "cheerio";
import miniget from "miniget";
import fetch, { RequestInit } from "node-fetch";
import { createWriteStream, existsSync, mkdirSync, unlinkSync } from "node:fs";
import * as puppeteer from "puppeteer";
import http from "node:http";
import https from "node:https";
import { exit } from "node:process";
import { IMusic, IUser, IVideo } from "../../Interfaces";
import { Music, User, Video } from "../Entities";
import { CookieJar } from "netscape-cookies-parser";
import { getUserVideos } from "./User-Videos";

export class TTScraper {
  _cookiesJar: CookieJar = new CookieJar();
  _cookies: string;

  constructor(cookiesPath?: string) {
    cookiesPath
      ? (this._cookies = this._cookiesJar.load(cookiesPath!))
      : (this._cookies = "");
  }

  /**
   * Fetches the website content and convert its content into text.
   * @param baseUrl baseUrl of the site to fetch
   * @param fetchOptions node-fetch fetch options. Optional
   * @returns Promise<cheerio.CheerioAPI>

  Example:
  ```ts
  const $ = await requestWebsite("https://www.amazon.de/s?k=" + "airpods")
  // => will return cheerio API Object to work with.

  $(".prices").each((_, value) => {
  console.log($(value).text().trim());
  });
  ```
   */
  private async requestWebsite(baseUrl: string, fetchOptions?: RequestInit) {
    const httpAgent = new http.Agent({
      keepAlive: true,
      maxSockets: 20,
    });
    const httpsAgent = new https.Agent({
      keepAlive: true,
      maxSockets: 20,
    });

    const DefaultOptions = {
      agent: (_parsedURL: any) => {
        if (_parsedURL.protocol == "http:") {
          return httpAgent;
        } else {
          return httpsAgent;
        }
      },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.134 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        Cookie: `${this._cookies ? this._cookiesJar.toString() : ""}`,
      },
    };

    const req = await fetch(
      `${baseUrl}`,
      fetchOptions ? fetchOptions : DefaultOptions
    );
    const res = await req.text();
    // console.log(res);
    const $ = cheerio.load(res, {
      xmlMode: true,
    });
    return $;
  }

  /**
   * Extract the JSON Object from the DOM with JavaScript instead of cheerio
   * @param html string
   * @returns
   */

  private extractJSONObject(html: string) {
    const endofJson = html
      .split(
        `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">`
      )[1]
      .indexOf("</script>");

    const InfoObject = html
      .split(
        `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">`
      )[1]
      .slice(0, endofJson);

    return InfoObject;
  }

  /**
   * Trys to parse the JSON Object extracted from the Page HTML
   * @param content HTML DOM Content
   * @returns
   */

  private checkJSONExisting(content: string) {
    try {
      return JSON.parse(content) ? true : false;
    } catch (error) {}
  }

  /**
   * Does Tiktok Requests with headless chrome
   * @param url
   * @returns
   */

  private async requestWithPuppeteer(url: string) {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    const tiktokPage = await page.goto(url, { waitUntil: "domcontentloaded" });

    if (tiktokPage == null) {
      await browser.close();
      throw new Error("Could not load the desired Page!");
    }

    const html = await tiktokPage.text();

    await browser.close();
    return this.extractJSONObject(html);
  }

  /**
   * Replaces the window Object with a export string and writes the new JS file to work with the result as a JS Object
   * @param content the HTML content of the Page
   * @deprecated No need for this function anymore since Tiktok now adds the json directly to the html in a seperated script tag
   */

  private handleHTMLContent(content: string) {
    const htmlObject = content;
    const removeWindowObject = htmlObject
      .split("window['__UNIVERSAL_DATA_FOR_REHYDRATION__']=")[1]
      .indexOf(";window['SIGI_RETRY']=");

    const object = JSON.parse(
      htmlObject
        .split("window['__UNIVERSAL_DATA_FOR_REHYDRATION__']=")[1]
        .slice(0, removeWindowObject)
    );
    return object;
  }

  /**
   * Checker to use Node-fetch over puppteer in case cookies were not required since it happens randomly
   * @param link
   * @returns
   */

  private async TryFetch(link: string) {
    const $ = await this.requestWebsite(link);
    if (
      !this.checkJSONExisting($("#__UNIVERSAL_DATA_FOR_REHYDRATION__").text())
    ) {
      const videoJson = await this.requestWithPuppeteer(link);
      return JSON.parse(videoJson);
    } else {
      return JSON.parse($("#__UNIVERSAL_DATA_FOR_REHYDRATION__").text());
    }
  }

  /**
   * Scrapes the tiktok video info from the given Link
   * @param uri tiktok video url
   * @returns Video
   */

  async video(uri: string, noWaterMark?: boolean): Promise<Video | void> {
    if (!uri) throw new Error("A video URL must be provided");
    let videoObject = await this.TryFetch(uri);
    const id = videoObject.ItemList?.video?.list[0] ?? 0;
    if (id == 0) return console.log(`Could not find the Video on Tiktok!`);
    const videoURL = noWaterMark
      ? await this.noWaterMark(uri)
      : videoObject.ItemModule[id].video.playAddr.trim();

    const videoResult: IVideo = new Video(
      id,
      videoObject.ItemModule[id].desc,
      new Date(
        Number(videoObject.ItemModule[id].createTime) * 1000
      ).toLocaleDateString(),
      Number(videoObject.ItemModule[id].video.height),
      Number(videoObject.ItemModule[id].video.width),
      Number(videoObject.ItemModule[id].video.duration),
      videoObject.ItemModule[id].video.ratio,
      videoObject.ItemModule[id].stats.shareCount,
      videoObject.ItemModule[id].stats.diggCount,
      videoObject.ItemModule[id].stats.commentCount,
      videoObject.ItemModule[id].stats.playCount,
      videoURL,
      videoObject.ItemModule[id].video.cover,
      videoObject.ItemModule[id].video.dynamicCover,
      videoURL,
      videoObject.ItemModule[id].video.format,
      videoObject.ItemModule[id].author,
      `https://www.tiktok.com/@${videoObject.ItemModule[id].author}/video/${id}`
    );

    return videoResult;
  }

  /**
   * Scrapes the given user page and returns all available info
   * @param username tiktok username of a user
   * @returns User
   */

  async user(username: string): Promise<User> {
    if (!username) throw new Error("Please enter a username");

    let infoObject = await this.TryFetch(`https://www.tiktok.com/@${username}`);
    const userDetails = infoObject.__DEFAULT_SCOPE__["webapp.user-detail"];

    const userObject = userDetails.userInfo.user;

    const userResult: IUser = new User(
      userObject.id,
      userObject.uniqueId,
      userObject.nickname,
      userObject.avatarLarger,
      userObject.signature.trim(),
      new Date(userObject.createTime * 1000).toLocaleDateString(),
      userObject.verified,
      userObject.secUid,
      userObject?.bioLink?.link,
      userObject.privateAccount,
      userDetails.userInfo.stats.followerCount,
      userDetails.userInfo.stats.followingCount,
      userDetails.userInfo.stats.heart,
      userDetails.userInfo.stats.videoCount
    );
    console.log(userResult);
    return userResult;
  }

  /**
   * Scrapes a user page and returns a list of all videos for this user
   * @param username tiktok username
   * @param noWaterMark whether the returned videos should be without watermark
   * @returns IVideo[]
   */

  async getAllVideosFromUser(
    username: string,
    isGetAllVideos: boolean = true,
    noWaterMark?: boolean
  ): Promise<IVideo[]> {
    if (!username) throw new Error("You must provide a username!");

    const { secretUID } = await this.user(`${username}`);

    if (!secretUID) {
      throw new Error("Couuld not find user UID!");
    }
    let cursor = "";

    const videos: IVideo[] = [];
    const resultArray = [];
    const userVideos = await getUserVideos(secretUID, cursor);

    if (userVideos?.itemList) {
      resultArray.push(userVideos.itemList);
      cursor = userVideos.cursor;
    }

    if (isGetAllVideos === true && userVideos?.hasMore === true) {
      while (true) {
        const fetchMore = await getUserVideos(secretUID, cursor);
        resultArray.push(fetchMore.itemList);
        cursor = fetchMore.cursor;
        if (fetchMore.hasMore == false) {
          break;
        }
      }
    }

    for (const result of resultArray) {
      for (const video of result) {
        videos.push(
          new Video(
            video.id,
            video.desc,
            new Date(Number(video.createTime) * 1000).toLocaleDateString(),
            Number(video.video?.height),
            Number(video.video?.width),
            Number(video.video?.duration),
            video.video?.ratio,
            video?.stats?.shareCount,
            video?.stats?.diggCount,
            video?.stats?.commentCount,
            video?.stats?.playCount,
            noWaterMark
              ? await this.noWaterMark(
                  `https://www.tiktok.com/@${video.author.uniqueId}/video/${video.id}`
                )
              : video.video?.downloadAddr.trim(),
            video?.video?.cover,
            video?.video?.dynamicCover,
            noWaterMark
              ? await this.noWaterMark(
                  `https://www.tiktok.com/@${video.author.uniqueId}/video/${video.id}`
                )
              : video.video?.downloadAddr.trim(),
            video?.video?.format,
            video.author,
            `https://www.tiktok.com/@${video.author.uniqueId}/video/${video.id}`
          )
        );
      }
    }

    return videos;
  }

  async getAllVideosFromUserWithCursor(
    username: string,
    cursor: string = "",
    noWaterMark?: boolean
  ): Promise<{ videos: IVideo[]; newCursor: string; isHasMore: boolean }> {
    if (!username) throw new Error("You must provide a username!");

    const { secretUID } = await this.user(`${username}`);

    if (!secretUID) {
      throw new Error("Could not find user UID!");
    }

    const videos: IVideo[] = [];
    const resultArray = [];
    const userVideos = await getUserVideos(secretUID, cursor);

    if (userVideos?.itemList) {
      resultArray.push(userVideos.itemList);
      cursor = userVideos.cursor;
    }

    const isHasMore = userVideos?.hasMore === true;

    for (const result of resultArray) {
      for (const video of result) {
        videos.push(
          new Video(
            video.id,
            video.desc,
            new Date(Number(video.createTime) * 1000).toLocaleDateString(),
            Number(video.video?.height),
            Number(video.video?.width),
            Number(video.video?.duration),
            video.video?.ratio,
            video?.stats?.shareCount,
            video?.stats?.diggCount,
            video?.stats?.commentCount,
            video?.stats?.playCount,
            noWaterMark
              ? await this.noWaterMark(
                  `https://www.tiktok.com/@${video.author.uniqueId}/video/${video.id}`
                )
              : video.video?.downloadAddr.trim(),
            video?.video?.cover,
            video?.video?.dynamicCover,
            noWaterMark
              ? await this.noWaterMark(
                  `https://www.tiktok.com/@${video.author.uniqueId}/video/${video.id}`
                )
              : video.video?.downloadAddr.trim(),
            video?.video?.format,
            video.author,
            `https://www.tiktok.com/@${video.author.uniqueId}/video/${video.id}`
          )
        );
      }
    }

    return { videos, newCursor: cursor, isHasMore: isHasMore };
  }

  /**
   * Scrapes the given Link and returns information about the Music of the Video
   * @param link tiktok video url
   * @returns Music
   */

  async getMusic(link: string): Promise<Music> {
    if (!link) throw new Error("You must provide a link!");

    let musicObject: any = await this.TryFetch(link);

    const id = musicObject.ItemList.video.list[0];

    const music: IMusic = new Music(
      musicObject.ItemModule[id].music.id,
      musicObject.ItemModule[id].music.title,
      musicObject.ItemModule[id].music.playUrl,
      musicObject.ItemModule[id].music.coverLarge,
      musicObject.ItemModule[id].music.coverThumb,
      musicObject.ItemModule[id].music.authorName,
      Number(musicObject.ItemModule[id].music.duration),
      musicObject.ItemModule[id].music.original,
      musicObject.ItemModule[id].music.album
    );

    return music;
  }

  /**
   * Downloads all videos from a user page!
   * @param username tiktok username of the user
   * @param options download options
   */

  async downloadAllVideosFromUser(
    username: string,
    options: {
      path?: string;
      watermark?: boolean;
    }
  ) {
    if (!username) throw new Error("Please enter a username!");

    const getAllvideos = await this.getAllVideosFromUser(username);

    if (!getAllvideos)
      throw new Error(
        "No Videos were found for this username. Either the videos are private or the user has not videos"
      );

    if (!options.path) {
      options.path = `${__dirname}/../${username}`;
      if (existsSync(options.path)) {
        console.log(`A folder with this username exists, that is unusual!`);
        try {
          unlinkSync(options.path);
        } catch (error: any) {
          console.log(
            `[ERROR] Could not remove ${options.path}\n Error Message: ${error.message}`
          );
          exit(1);
        }
      }

      if (!existsSync(options.path)) {
        mkdirSync(options.path);
      }
    }

    if (options.watermark) {
      for (const [index, video] of getAllvideos.entries()) {
        console.log(
          `Downloading Video: ${
            video.description ? video.description : video.id
          }, [${index + 1}/${getAllvideos.length}]`
        );

        let noWaterMarkLink = await this.noWaterMark(video.id);

        if (!noWaterMarkLink) {
          console.log(
            `Could not fetch ${
              video.description ? video.description : video.id
            } with no watermark`
          );
          continue;
        }

        miniget(noWaterMarkLink).pipe(
          createWriteStream(
            `${options.path}/${video.id}_${video.resolution}.${video.format}`
          )
        );
      }
      return;
    }

    for (const [index, video] of getAllvideos.entries()) {
      console.log(
        `Downloading Video: ${
          video.description ? video.description : video.id
        }, [${index + 1}/${getAllvideos.length}]`
      );

      miniget(video.downloadURL).pipe(
        createWriteStream(
          `${options.path}/${video.id}_${video.resolution}.${video.format}`
        )
      );
    }
  }

  /**
   * Returns direct download link for the video with no watermark!
   * @param link tiktok video url
   * @returns string
   */

  async noWaterMark(link: string): Promise<string | undefined | void> {
    const data = { url: link, count: "12", cursor: "0", web: "1", hd: "1" };
    const fetchNoWaterInfo = await fetch("https://www.tikwm.com/api/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(data).toString(),
    });

    if (!fetchNoWaterInfo.ok) {
      throw new Error(
        "There was an Error retrieveing this video without watermark!"
      );
    }
    const noWaterJson = await fetchNoWaterInfo.json();
    if (noWaterJson.code === -1) {
      throw new Error(
        "API Limit for nowatermark, please wait 1 second and try again!"
      );
    }

    return "https://www.tikwm.com" + noWaterJson.data.hdplay;
  }

  /**
   * Scrapes hashtag posts
   * @param tag tiktok hashtag
   * @returns Promise<IVideo[]>
   */

  async hashTag(tag: string): Promise<IVideo[]> {
    if (!tag)
      throw new Error("You must provide a tag name to complete the search!");

    let tagsObject = await this.TryFetch(`https://www.tiktok.com/tag/${tag}`);

    const { ItemList } = tagsObject;

    const videos: IVideo[] = [];

    for (const video of ItemList.challenge.list) {
      videos.push(
        new Video(
          tagsObject.ItemModule[video].video.id,
          tagsObject.ItemModule[video].desc,
          new Date(
            Number(tagsObject.ItemModule[video].createTime) * 1000
          ).toLocaleDateString(),
          Number(tagsObject.ItemModule[video].video.height),
          Number(tagsObject.ItemModule[video].video.width),
          Number(tagsObject.ItemModule[video].video.duration),
          tagsObject.ItemModule[video].video.ratio,
          tagsObject.ItemModule[video].stats.shareCount,
          tagsObject.ItemModule[video].stats.diggCount,
          tagsObject.ItemModule[video].stats.commentCount,
          tagsObject.ItemModule[video].stats.playCount,
          tagsObject.ItemModule[video].video.downloadAddr.trim(),
          tagsObject.ItemModule[video].video.cover,
          tagsObject.ItemModule[video].video.dynamicCover,
          tagsObject.ItemModule[video].video.playAddr.trim(),
          tagsObject.ItemModule[video].video.format,
          tagsObject.ItemModule[video].author
        )
      );
    }
    return videos;
  }
}
