import cv2
import numpy as np


def bypass_slider(image):
    img_grey = cv2.imread(image, cv2.IMREAD_COLOR)
    sai_so = 10000
    mau_can_loc_R = 255
    mau_can_loc_G = 255
    mau_can_loc_B = 255
    khai_bao_mau = cv2.inRange(
        img_grey,
        np.array(
            [mau_can_loc_R - sai_so, mau_can_loc_G - sai_so, mau_can_loc_B - sai_so]
        ),
        np.array(
            [mau_can_loc_R + sai_so, mau_can_loc_G + sai_so, mau_can_loc_B + sai_so]
        ),
    )
    ket_qua_giu_mau = cv2.max(
        img_grey, cv2.cvtColor(255 - khai_bao_mau, cv2.COLOR_GRAY2BGR)
    )
    lam_mo = cv2.GaussianBlur(ket_qua_giu_mau, (7, 5), 0)
    canny = cv2.Canny(lam_mo, 255, 255)
    contours, hierarchy = cv2.findContours(
        canny, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE
    )
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    cv2.drawContours(img_grey, contours, 0, (0, 255, 0), 3)
    # cv2.imshow('img_grey', img_grey)
    # cv2.waitKey(0)
    # cv2.destroyAllWindows()
    x_swipe = 210
    M = cv2.moments(contours[0])
    center_X = int(M["m10"] / M["m00"])
    print(center_X)
    return center_X


# print(bypass_slider('captcha\\captcha.jpeg'))
