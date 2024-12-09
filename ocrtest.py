import easyocr
import cv2
from PIL import Image
import io

reader = easyocr.Reader(['en'], gpu=False)


img = Image.open('test1.png')
imgwidth = img.size[0]
imgheight = img.size[1]

firstline = img.crop((0,0,imgwidth,23))
firstline.show()
buff = io.BytesIO()
firstline.save(buff, 'png')
res = reader.readtext(buff.getvalue())
for x in res:
	print(x[1])

linesvisible = int((imgheight - 23)/18) # (height - top line) / line height

for i in range(linesvisible):
	line = img.crop((0, 23 + 18 * i, imgwidth, 23 + 18 * (i+1)))
	line.show()
	buff = io.BytesIO()
	line.save(buff, 'png')
	res = reader.readtext(buff.getvalue())
	for x in res:
		print(x[1])


