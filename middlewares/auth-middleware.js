const jwt = require("jsonwebtoken");
const { Users } = require("../models");

// 사용자 인증 미들웨어
module.exports = async (req, res, next) => {
  try {
    const { authorization } = req.cookies;
    // autorization 이라는 쿠키가 존재하지 않았을때를 대비
    const [tokenType, token] = (authorization ?? "").split(" ");

    if (!token || tokenType !== "Bearer") {
      res.status(401).send({
        errorMessage: "로그인 후 이용 가능한 기능입니다.",
      });
      return;
    }

    // authToken이 만료되었는지 확인
    // authToken이 서버가 발급한 토큰이 맞는지 검증

    const decodedToken = jwt.verify(token, "customized-secret-key");
    const userId = decodedToken.userId;
    // authToken에 있는 userId에 해당하는 사용자가 실제 DB에 존재하는지 확인

    const user = await Users.findOne({ where: { userId } });
    if (!user) {
      res.clearCookie("authorization");
      return res.status(401).json({
        message: "토큰 사용자가 존재하지 않습니다.",
      });
    }
    res.locals.user = user;
    res.locals.userNickname = user.nickname;

    next();
  } catch (err) {
    res.clearCookie("authorization");
    res.status(401).send({
      errorMessage: "전달된 쿠키에서 오류가 발생했습니다.",
    });
  }
};
