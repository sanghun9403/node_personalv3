const jwt = require("jsonwebtoken");
const { Users, Tokens } = require("../models");

// 사용자 인증 미들웨어
module.exports = async (req, res, next) => {
  const { authorization } = req.cookies;
  const refreshToken = await Tokens.findOne({ order: [["createdAt", "DESC"]] });
  const [accessTokenType, accessToken] = (authorization ?? "").split(" ");

  try {
    // case 1 : accessToken과 refreshToken 둘다 없는 경우
    if (!refreshToken && !accessToken) {
      return res.status(401).send({
        message: "로그인 후 이용 가능한 기능입니다.",
      });
    }
    // case 2 : accessToken은 없고 refreshToken은 있는 경우
    else if (!accessToken && refreshToken) {
      jwt.verify(refreshToken.tokenId, process.env.JWT_SECRET_KEY);
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
      next();
    }
    // case 3 : 둘다 만료 검사
    else {
      jwt.verify(refreshToken.tokenId, process.env.JWT_SECRET_KEY);
      const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET_KEY);
      const userId = decodedToken.userId;
      const user = await Users.findOne({ where: { userId } });

      res.locals.user = user;
      next();
    }
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      res.clearCookie("authorization");
      return res.status(401).send({
        errorMessage: "만료된 토큰입니다. 다시 로그인 해주세요.",
      });
    } else {
      return res.status(400).json({
        message: "잘못된 접근 방법입니다.",
      });
    }
  }
};
