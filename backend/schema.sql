일반 인증키 복사해서 .env의 DATA_GO_KR_KEY에 붙여
넣어주시면 
데이터를 공공데이터 서버에서제공받을수있고
이것을 화면에 출력 DB에 저장하실 수 있으십니다

되시면
frontend 코드도만들어 달라고 하시면 왠만하면 잘됩니다.

C:\vibe_advanced\day2\my-api 의 .env 복사해서 
현재 local 컴퓨터에서 접근 가능하도록하고 
공공데이터관련 DATA_GO_KR_KEY 이 내용도 추가해라  

power shell terminal을열고 backend 실행하는 명령어줘 
power shell terminal 하나 더열고 frontend 실행하는 명령어줘 


IP(인터넷 주소) port  278.248.217.4:8000 (backend 서버 ) railway 
frontend 서버 포트 (5000) vercel 


XML  HTML과 동일한 형태(HTML 은 <>   </>  정해진 태그 
XML은 태그는 같은 데 <Z>  </Z> 
JSON ( 배열 (객체)) 

내 컴퓨터에서 공공(미세먼지)데이터를 받아서 backend에서 받아서 frontend에 전달해서
표시

배포하지 않은 상태(railway , vercel)
supabase에 저장하지 않은 상태 




SUPABASE_URL=https://uesxytgrrizqmhggsotb.supabase.co
SUPABASE_SECRET_KEY=<your-supabase-secret-key>
FRONT_ORIGINS=https://day3-frontend-alpha.vercel.app  
ADMIN_TOKEN=<your-admin-token>
DATA_GO_KR_KEY=<your-data-go-kr-key>
SIDO_NAME=제주
COLLECT_MINUTES=60





vercel에 추가함 
Key: VITE_API_URL
Value: https://그주소.up.railway.app
config 설정으로 추가해주세요
클라우드(구름) 여러개의 컴퓨터를 모아놓은것(, railway , vercel) 자원 빌려쓰고 있음 
github(코드 서버)를 통해 배포되어 있는 상태, 인터넷으로 접근이 가능 
db(supabase)에 아무 작업도 안되고 있다
공공데이터를 api를 통해 미세먼지 정보를 backend에서받아서 frontend출력

미세먼지를 받아서 가공하고 머신러닝(인공지능) 선형회귀(Linear regresion)
주식 차트 다음 시간에 어떻게 변활지 , 시계열 분석 을 하는 코드 는 있을것이고
오늘 이시간의 미세정보 DB에저장하고 내일 이시간에 미세정보 저장하고  

PS C:\vibe_advanced\day3\backend> git add .
PS C:\vibe_advanced\day3\backend> git  commit -m "supabase에 저장"
PS C:\vibe_advanced\day3\backend> git push 

야 지금 이 아키텍처 설명하는 에니메이션으로 html. 생성하라

리액트(메타)를 다룰거라
리액트 앵귤라 vue.js 

1)변수가 무엇인가
2) = 는 어떻게 의미를 가지는가?
3) 문자열을 결합하는과정
4) 숫자 하나를 증가시키는 방법 ,  cnt ++ , cnt = cnt+1 
5) 배열에서 데이터 하나씩 꺼낼때 변수[0] 0부터 시작한다  


 를 설명하는 animation을 만들고 음성이 필요하잖아 무료 음성 edge-tts를 활용하여 mp4로 만들자 
우리는 가상환경(vjeju)에 필요한 패키지를 설치해라 그리고 mpeg 관련된 설치 방법을 알려달라 

8.html을 생성
script를 넣고 
변수 let price =
[

	{"name_price": 50  ,"amount"  :  3  } ,
	{"name_price": 53  ,"amount"  :  5  } ,
	{"name_price": 52  ,"amount"  :  2  } ,
	{"name_price": 150  ,"amount"  :  7  } ,
	{"name_price": 500  ,"amount"  :  1  } ,


]

let total=0
for(const u of price){
	total = total + u.name_price * u.amount 
}
console.log(total) //단가 * 수량 =총금액 



각각의 객체의 변수는 유지하고 이미지 바나나 , 귤 배 사과 복숭아 가 객체에 담길수 있도록하여
animation을 효과적으로하자 


