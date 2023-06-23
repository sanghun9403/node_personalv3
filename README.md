## Node.js 숙련 Lv3 과제

### 필수요구사항
**1. ERD 작성**
**2. 기존 mongoose 방식을 sequelize 방식으로 변경**
**3. 환경변수를 사용하여 config 파일과 jwt secret key 보안강화**

### API 명세서 링크
https://sh-9403.notion.site/f035d3df19484ae88e79de6c35744086?v=3f29cf9665ca43019b413297313971dc&pvs=4

**ERD**
![ERD]([https://cdn.pixabay.com/photo/2019/03/13/08/29/cat-4052454_1280.jpg](https://file.notion.so/f/s/c763debc-29e6-4211-9adc-c9c58e5a1c3e/drawSQL-personal-export-2023-06-23_(1).png?id=6df04b20-650d-4887-abfd-4680fac10b38&table=block&spaceId=0f08c169-f0d5-4837-ab2d-83e1fc75ee5e&expirationTimestamp=1687602155372&signature=lIJcLnGES-V7mjT1X_q-6arocWWWMY32FNpzQSWWrgU&downloadName=drawSQL-personal-export-2023-06-23+%281%29.png))

**<1. 회원가입 API>**
- 닉네임은 최소 3자 이상, 특수문자 및 공백 사용불가
- 비밀번호는 최소 4자 이상, 닉네임과 같은 값이 포함될 수 없음
- 입력한 값이 DB에 저장된 닉네임 또는 이메일과 같을 경우 오류메세지 리턴
- 예외사항 이외의 오류는 try catch 구문으로 예외처리

**<2. 로그인 API> 편의상 refresh token = RT / access token = AT**
- 입력한 정보와 Users DB의 데이터가 일치하는지 확인
- 로그인 할 userId값과 일치하는 refresh token(RT) 값이 있는지 DB를 통해 확인 후 없다면 refresh token과 access token을(AT) 생성
- DB에 userId값과 일치하는 RT가 있다면 해당 토큰 검증을 실행하고, 삭제 후 재생성하여 생성날짜를 최신 상태로 유지 (DB의 가장 위에 있게)
  -> AT가 만료되고 RT만 있는 경우 게시글 작성/수정/삭제를 할 때 AT를 재발급하는 구조에서 다른 유저들의 RT도 DB에 있다보니 AT가 없는 상황에서 해당 CRUD기능을 작동 시 가장 위에 있는 토큰의 userId값이 나오는 현상이 발생하여 임의로 조치하였음
ex) 유저를 차례대로 1, 2, 3번으로 생성하였을때 DB의 RT는 3번이 가장 최신, 이 때 1번 유저로 로그인한 뒤 쿠키를 삭제하여 AT가 없는 상황을 만들고 게시글을 생성하면 3번 유저ID가 작성한 것으로 생성되는 문제
- userId값과 일치하는 RT가 만료되었을 경우 에러메세지 반환

**<3. 계정전환 API>**
- 전환할 유저 ID와 Users DB의 데이터가 존재하는지 확인 후 해당 ID의 RT가 존재하는지 확인
- 전환할 유저 ID의 RT가 만료되었다면 재로그인이 필요하다는 에러메세지 반환

**<4. 사용자 검증 Middleware>**
- post, put, delete 작동 시 사용자 검증 실행
- AT와 RT를 검증하여 각 상황에 맞는 예외처리 메세지 반환
- RT가 존재하는데 AT가 없는 경우, 게시글 작성, 수정, 삭제를 실행하면 토큰을 재생성 해줌 (로그인 유지 효과)
