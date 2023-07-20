import os
import sys
from pathlib import Path
from time import sleep

import requests
from PIL import Image
from random_user_agent.user_agent import UserAgent
from selenium import webdriver
from selenium.webdriver import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.support.wait import WebDriverWait
from webdriver_manager.firefox import GeckoDriverManager

from .bypass_captcha import bypass_slider

executable_path = "geckodriver"
opts = webdriver.FirefoxOptions()

# executable_path = "chromedriver"
# opts = uc.ChromeOptions()

# opts.add_argument("-headless")
opts.add_argument(f"--user-agent={UserAgent().get_random_user_agent()}")

driver = webdriver.Firefox(
    service=FirefoxService(GeckoDriverManager().install()), options=opts
)

driver.set_window_size(1080, 3096)


def get_user_videos_no_captcha(username: str) -> list:
    username = username.strip()
    if "@" not in username:
        username = "@" + username

    baseurl = "https://www.tiktok.com/"

    url = "{}{}".format(baseurl, username)

    urls = []
    # try:
    driver.get(url)
    driver.maximize_window()

    # driver.execute_script("window.scrollBy(0,document.body.scrollHeight);")
    # sleep(2)

    # driver.execute_script("window.scrollBy(0,document.body.scrollHeight);")
    sleep(2)

    vidurls = driver.find_elements(
        By.XPATH, "//div[contains(@class, 'DivTagCardDesc')]/a"
    )

    for vidurl in vidurls:
        h = vidurl.get_attribute("href")
        if h not in urls:
            urls.append(h)

    return urls


def get_user_videos(username: str) -> list:
    username = username.strip()
    if "@" not in username:
        username = "@" + username

    baseurl = "https://www.tiktok.com/"

    url = "{}{}".format(baseurl, username)

    n = 0
    urls = []
    # try:
    driver.get(url)
    driver.maximize_window()

    keeplooking = True
    is_solved_captcha = False

    while keeplooking == True:
        driver.execute_script("window.scrollBy(0,document.body.scrollHeight);")
        sleep(2)

        driver.execute_script("window.scrollBy(0,document.body.scrollHeight);")
        sleep(2)

        # endless = driver.find_element_by_xpath("//style[contains(@data-emotion, 'DivBottomContainer')]")
        # driver.execute_script("arguments[0].scrollIntoView(true);", endless)

        for _ in range(30):
            if not is_solved_captcha:
                sleep(1)
            else:
                sleep(0.1)
            html = driver.page_source
            if "Drag the slider" in html:
                keeplooking = False

                break

            if "Drag the puzzle piece into place" in html:
                print("Captcha detected, solving...")

                try:
                    captcha_image_url = (
                        WebDriverWait(driver, timeout=10)
                        .until(lambda d: d.find_element(By.ID, "captcha-verify-image"))
                        .get_attribute("src")
                    )
                    print(captcha_image_url)
                    # captcha_image_url = driver.find_element(
                    #     By.ID, "captcha-verify-image"
                    # ).get_attribute("src")
                    # save captcha image by url with requests
                    Path("captcha").mkdir(parents=True, exist_ok=True)
                    tmp_captcha_file = os.path.join("captcha", "captcha.png")
                    with open(tmp_captcha_file, "wb") as f:
                        f.write(requests.get(captcha_image_url).content)

                    img = Image.open(tmp_captcha_file)
                    img = img.resize((340, 212))
                    img.save(tmp_captcha_file)

                    x_point = bypass_slider(tmp_captcha_file)
                    x_point = int(x_point) - 30
                    print(x_point)

                    scrollBar = driver.find_element(
                        By.CLASS_NAME, "secsdk-captcha-drag-icon"
                    )
                    # print(scrollBar)

                    ActionChains(driver).click_and_hold(scrollBar).perform()
                    ActionChains(driver).move_by_offset(xoffset=1, yoffset=0).perform()
                    ActionChains(driver).move_by_offset(xoffset=1, yoffset=0).perform()
                    ActionChains(driver).move_by_offset(xoffset=1, yoffset=0).perform()
                    ActionChains(driver).move_by_offset(xoffset=1, yoffset=0).perform()
                    ActionChains(driver).move_by_offset(xoffset=-4, yoffset=0).perform()
                    ActionChains(driver).move_by_offset(
                        xoffset=int(x_point), yoffset=0
                    ).perform()
                    ActionChains(driver).release().perform()

                    for _ in range(5):
                        if is_solved_captcha:
                            continue

                        html = driver.page_source
                        if "Verification complete" in html:
                            is_solved_captcha = True
                        if not is_solved_captcha:
                            sleep(1)

                except Exception as e:
                    print(e)
                    driver.find_element(
                        By.XPATH,
                        '//*[@id="tiktok-verify-ele"]/div/div[4]/div/a[1]/span[2]',
                    ).click()

        vidurls = driver.find_elements(
            By.XPATH, "//div[contains(@class, 'DivWrapper')]/a"
        )

        is_found_new_url = False
        for vidurl in vidurls:
            h = vidurl.get_attribute("href")
            if h not in urls:
                urls.append(h)
                is_found_new_url = True

        if not is_found_new_url:
            keeplooking = False

    return urls
