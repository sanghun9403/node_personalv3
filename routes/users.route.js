const express = require("express");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { Tokens, Users } = require("../models");
const router = express.Router();

// 회원가입
router.post("/signup", async (req, res) => {
  const { email, nickname, password, confirmPassword } = req.body;
  const savedUsers = await Users.findOne({
    where: {
      [Op.or]: [{ email }, { nickname }],
    },
  });
  let regExp = /[ \{\}\[\]\/?.,;:|\)*~`!^\-_+┼<>@\#$%&\'\"\\\(\=]/;

  console.log(savedUsers);
  try {
    if (nickname.length <= 3 || regExp.test(nickname)) {
      res.status(412).json({
        message: "닉네임은 최소 3자 이상이여야 하며, 특수문자 및 공백을 사용할 수 없습니다.",
      });
      return;
    } else if (password.length <= 4 || password === nickname) {
      res.status(412).json({
        message: "비밀번호는 최소 4자 이상이여야 하며, 닉네임과 같은 값이 포함될 수 없습니다.",
      });
      return;
    }

    if (password !== confirmPassword) {
      res.status(412).json({
        message: "입력한 비밀번호와 비밀번호 확인값이 일치하지 않습니다.",
      });
      return;
    }

    if (savedUsers) {
      res.status(412).json({
        message: "이메일 또는 닉네임이 이미 사용중입니다.",
      });
      return;
    }

    const user = await Users.create({ email, nickname, password });

    return res.status(201).json({
      message: "회원가입이 완료되었습니다.",
    });
  } catch (err) {
    res.status(400).json({
      message: "요청한 데이터 형식이 올바르지 않습니다.",
    });
  }
});

// 로그인 API
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await Users.findOne({ where: { email } });
    const savedTokenUser = await Tokens.findOne({});

    if (!user || password !== user.password) {
      return res.status(400).json({
        errorMessage: "이메일 또는 패스워드가 틀렸습니다.",
      });
    }
    // 리프레시 토큰 생성
    const refreshToken = jwt.sign({}, process.env.JWT_SECRET_KEY, { expiresIn: "1m" });
    if (savedTokenUser) {
      await Tokens.destroy({ where: {} });
    }
    await Tokens.create({ tokenId: refreshToken, UserId: user.userId });

    // 액세스 토큰 생성
    const accessToken = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET_KEY, {
      expiresIn: "30m",
    });
    res.cookie("authorization", `Bearer ${accessToken}`);

    res.status(200).json({
      accessToken,
      message: "로그인에 성공하였습니다.",
    });
  } catch (err) {
    res.status(400).json({
      message: "로그인에 실패하였습니다.",
    });
  }
});

// 로그아웃 기능
router.delete("/logout", async (req, res) => {
  await Tokens.destroy({ where: {} });
  res.clearCookie("authorization");

  res.status(200).json({
    message: "로그아웃 되었습니다.",
  });
});

module.exports = router;
