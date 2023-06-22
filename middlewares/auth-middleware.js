const jwt = require("jsonwebtoken");
const { Users, Tokens } = require("../models");

// 사용자 인증 미들웨어
module.exports = async (req, res, next) => {
  const { authorization } = req.cookies;
  const refreshToken = await Tokens.findOne({});
  const [accessTokenType, accessToken] = (authorization ?? "").split(" ");

  try {
    // case 1 : accessToken과 refreshToken 둘다 없는 경우
    if (!refreshToken && !accessToken) {
      res.status(401).send({
        message: "로그인 후 이용 가능한 기능입니다.",
      });
      return;
    }
    // case 2 : accessToken은 만료되고 refreshToken은 있는 경우
    else if (!accessToken && refreshToken) {
      const accessToken = jwt.sign({ userId: refreshToken.UserId }, process.env.JWT_SECRET_KEY, {
        expiresIn: "30m",
      });
      res.cookie("authorization", `Bearer ${accessToken}`);

      const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET_KEY);
      const userId = decodedToken.userId;
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
    }
    // case 3 : accessToken & refreshToken 둘 다 있는 경우
    else {
      const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET_KEY);
      const userId = decodedToken.userId;
      const user = await Users.findOne({ where: { userId } });

      res.locals.user = user;
      res.locals.userNickname = user.nickname;
      next();
    }
  } catch (err) {
    res.clearCookie("authorization");
    res.status(401).send({
      errorMessage: "전달된 쿠키에서 오류가 발생했습니다.",
    });
  }
};
