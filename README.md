# Together

> 스포츠를 좋아하는 사람들을 위한 모임 매칭 플랫폼

## 프로젝트 소개

같은 스포츠를 즐기는 사람들끼리 정기모임·번개모임을 만들고 참가할 수 있는 웹 서비스입니다.
모임 참가부터 실시간 채팅, GPS 출석 체크, 매너 점수 관리까지 하나의 플랫폼에서 제공합니다.


## 프로젝트 키워드

- 실시간 통신 (Socket.io, WebSocket)
- 실시간 알림 (Namespace 기반 소켓 분리)
- GPS 기반 출석 체크 (Geolocation API)
- 자동화 스케줄러 (node-cron)
- 소셜 로그인 (Passport.js, OAuth)
- 지도 기반 모임 탐색 (Kakao Map API)

## 프로젝트 개요

운동을 함께할 사람을 찾거나 스포츠 모임을 만들고 싶어도 종목별로 체계적으로 모임을 찾고 관리할 수 있는 플랫폼이 부족하다는 문제에서 시작했다. 기존에는 오픈채팅, 카페, SNS 등 여러 서비스를 함께 이용해야 했고, 모임 모집부터 일정 관리, 소통까지 분산되어 있어 불편함이 많았다.
Together는 이러한 문제를 해결하기 위해 스포츠 모임에 필요한 기능을 하나의 플랫폼으로 통합한 서비스이다. 사용자는 축구, 농구, 배드민턴, 테니스 등 원하는 종목의 정기 모임과 번개 모임을 쉽게 찾거나 직접 개설할 수 있으며, 지역과 일정에 맞는 모임에 간편하게 참여할 수 있다.
또한 모임별 공지사항과 채팅 기능을 통해 참여자 간 원활한 소통을 지원하고, 출석 관리 기능으로 참여 현황을 효율적으로 관리할 수 있다. 매너 점수 시스템을 도입하여 무단 불참이나 비매너 행동을 줄이고, 신뢰할 수 있는 스포츠 모임 문화를 만드는 것을 목표로 한다.
Together는 단순히 모임을 연결하는 서비스를 넘어 모임 생성 → 모집 → 참여 → 소통 → 출석 관리 → 매너 평가까지 스포츠 모임의 전 과정을 하나의 서비스에서 제공하는 통합 플랫폼이다.

## 실행 방법

bash
git clone https://github.com/sd-team3/together.git
cd together
npm install

루트 디렉토리에 `.env` 파일을 생성하고 아래 항목을 설정합니다.

MONGO_URI=your_mongodb_uri
SESSION_SECRET=your_secret
KAKAO_CLIENT_ID=your_kakao_key

bash
npm start

## 주요 기능 및 상세

**정기모임 / 번개모임**
- 스포츠 종목, 지역, 인원을 설정해 모임 생성 및 참가
- 자동 승인 / 수동 승인 선택 가능
- 모임 상태 자동 변경 (모집 → 마감 → 활동 → 종료)
- 호스트의 멤버 강퇴 및 노쇼 처리 기능
- 정기모임 (정기적으로 이루어지는 모임)
- 번개모임(한번만 이루어지는 모임)


**실시간 채팅**
- Socket.io 기반 모임별 채팅방 자동 생성
- 채팅 알림 뮤트 기능

**알림 시스템**
- 가입 승인/거절, 모임 시작, 출석 체크 등 실시간 알림
- `/noti` 네임스페이스로 채팅 소켓과 분리 운영
- 스케줄러(node-cron)를 통한 자동 알림 발송

**친구 시스템**
- 친구 추가 / 즐겨찾기 / 삭제
- 친구 요청 수락/거절 실시간 처리
- 프로필 공개 범위 설정

**GPS 출석 체크**
- 모임 장소 기준 500m 이내 접근 시 출석 처리
- 출석 여부에 따라 매너 점수 자동 부여 / 차감
- 크루 rating 자동 집계

**커뮤니티 게시판**
- 게시글 작성 / 수정 / 삭제
- 댓글 및 좋아요 기능

**구현해야할 기능**
- 스케줄 관리 기능 ( 정기모임 )
- 매너점수 기반 랭킹 페이지
- 과거 알림 목록 페이지

## 기술 스택

**Backend**

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat&logo=socketdotio&logoColor=white)
![Passport.js](https://img.shields.io/badge/Passport.js-34E27A?style=flat&logo=passport&logoColor=white)

**Frontend**

![EJS](https://img.shields.io/badge/EJS-B4CA65?style=flat)
![Bootstrap](https://img.shields.io/badge/Bootstrap-7952B3?style=flat&logo=bootstrap&logoColor=white)

**Tools**

![Git](https://img.shields.io/badge/Git-F05032?style=flat&logo=git&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)


## ERD다이어 그램

<img width="1376" height="728" alt="er다이어그램" src="https://github.com/user-attachments/assets/b4481f01-c328-4792-95be-62bc2d829b9d" />



## 레포지토리 구조

```text
together/
├── app.js
├── config/                  # 소켓, DB, 인증 설정
│   ├── socket.js
│   ├── chatSocket.js
│   ├── friendSocket.js
│   ├── notiSocket.js
│   ├── passport.js
│   ├── database.js
│   ├── constants.js
│   └── upload.js
├── controllers/             # 요청 처리
│   ├── crew/
│   │   ├── activityController.js
│   │   ├── applicationController.js
│   │   ├── instantController.js
│   │   └── regularController.js
│   ├── community/
│   │   └── comController.js
│   ├── chatController.js
│   ├── friendController.js
│   ├── indexController.js
│   └── userController.js
├── middlewares/             # 인증, 유효성 검사
│   ├── activityMiddleware.js
│   ├── crewMiddleware.js
│   ├── errorMiddleware.js
│   └── validationMiddleware.js
├── models/                  # DB 스키마
│   ├── User.js
│   ├── regularCrew.js
│   ├── instantCrew.js
│   ├── crewActivity.js
│   ├── crewApplication.js
│   ├── ChatRoom.js
│   ├── Message.js
│   ├── Board.js
│   ├── Comment.js
│   ├── notification.js
│   └── friendRequest.js
├── routes/                  # 라우터
│   ├── crew/
│   │   ├── activityRouter.js
│   │   ├── instantRouter.js
│   │   └── regularRouter.js
│   ├── community/
│   │   └── comRouter.js
│   ├── authRouter.js
│   ├── chatRouter.js
│   ├── friendRouter.js
│   ├── indexRouter.js
│   ├── notiRouter.js
│   └── userRouter.js
├── services/                # 비즈니스 로직
│   ├── crew/
│   │   ├── activityService.js
│   │   ├── applicationService.js
│   │   ├── crewService.js
│   │   ├── instantService.js
│   │   └── regularService.js
│   ├── community/
│   │   └── comService.js
│   ├── chatService.js
│   ├── friendService.js
│   ├── indexService.js
│   ├── notiService.js
│   └── userService.js
├── utils/
│   └── scheduler.js         # 모임 상태 자동 변경
├── public/                  # 정적 파일
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── handlers/
│       ├── modules/
│       ├── board/
│       └── regularCrew/
└── views/                   # EJS 템플릿
    ├── crew/
    ├── community/
    ├── chat/
    ├── friend/
    ├── user/
    ├── error/
    ├── partials/
    └── index.ejs
```

## 팀원

**팀장** 조규형 (20211479)

- 이윤재 (20201459)
- 신승민 (20211057)
- 유승환 (20211482)
- 조연오 (20211493)
- 이은수 (20211494)




