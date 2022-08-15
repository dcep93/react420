import requests
import sys


def main(img_url: str):
    resp = requests.get(img_url)


if __name__ == "__main__":
    img_url = "https://pbs.twimg.com/media/FaM-E97WYAIiCuL?format=jpg&name=4096x4096"
    # img_url, = sys.argv[1:]
    main(img_url)
