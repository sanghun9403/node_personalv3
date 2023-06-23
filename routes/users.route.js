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

  try {
    if (nickname.length <= 3 || regExp.test(nickname)) {
      return res.status(412).json({
        message: "닉네임은 최소 3자 이상이여야 하며, 특수문자 및 공백을 사용할 수 없습니다.",
      });
    } else if (password.length <= 4 || password === nickname) {
      return res.status(412).json({
        message: "비밀번호는 최소 4자 이상이여야 하며, 닉네임과 같은 값이 포함될 수 없습니다.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(412).json({
        message: "입력한 비밀번호와 비밀번호 확인값이 일치하지 않습니다.",
      });
    }

    if (savedUsers) {
      return res.status(412).json({
        message: "이메일 또는 닉네임이 이미 사용중입니다.",
      });
    }

    await Users.create({ email, nickname, password });

    return res.status(201).json({
      message: "회원가입이 완료되었습니다.",
    });
  } catch (err) {
    return res.status(400).json({
      message: "요청한 데이터 형식이 올바르지 않습니다.",
    });
  }
});

// 로그인 API
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await Users.findOne({ where: { email } });
    const savedTokenUser = await Tokens.findOne({ where: { UserId: user.userId } });

    if (!user || password !== user.password) {
      return res.status(400).json({
        errorMessage: "이메일 또는 패스워드가 틀렸습니다.",
      });
    }

    if (!savedTokenUser) {
      // 리프레시 토큰 생성
      const refreshToken = jwt.sign({}, process.env.JWT_SECRET_KEY, { expiresIn: "7d" });
      // 액세스 토큰 생성
      const accessToken = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET_KEY, {
        expiresIn: "30m",
      });
      await Tokens.create({ tokenId: refreshToken, UserId: user.userId });
      res.cookie("authorization", `Bearer ${accessToken}`);
      return res.status(200).json({
        accessToken,
        message: "로그인에 성공하였습니다.",
      });
    }
    try {
      // 토큰 만료검사
      jwt.verify(savedTokenUser.tokenId, process.env.JWT_SECRET_KEY);

      // 삭제 후 재생성하여 생성날짜를 가장 최신으로 유지
      // accessToken이 만료되고 refreshToken만 있는 경우에 accessToken을 재발급하는 구조인데
      // refreshToken이 여러개가 있다보니 가장 위에 있는 tokenId가 나오는 것을 방지하기 위함
      // ex. 1번에서 3번으로 스위칭 후 엑세스토큰이 없는 상황을 가정했을 때 게시글 포스트 시 userId가 1번으로 등록되는 상황
      await Tokens.destroy({ where: { UserId: user.userId } });
      await Tokens.create({ tokenId: savedTokenUser.tokenId, UserId: user.userId });

      const accessToken = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET_KEY, {
        expiresIn: "30m",
      });
      res.cookie("authorization", `Bearer ${accessToken}`);
      return res.status(200).json({
        accessToken,
        message: "로그인에 성공하였습니다.",
      });
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        const refreshToken = jwt.sign({}, process.env.JWT_SECRET_KEY, { expiresIn: "7d" });
        const accessToken = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET_KEY, {
          expiresIn: "30m",
        });
        await Tokens.destroy({ where: { UserId: user.userId } });
        await Tokens.create({ tokenId: refreshToken, UserId: user.userId });
        res.cookie("authorization", `Bearer ${accessToken}`);
        return res.status(200).json({
          accessToken,
          message: "로그인에 성공하였습니다.",
        });
      } else {
        return res.status(400).json({
          message: "로그인에 실패하였습니다.",
        });
      }
    }
  } catch (err) {
    return res.status(400).json({
      message: "존재하지 않는 아이디 또는 잘못된 접근입니다.",
    });
  }
});

// 계정전환
router.post("/switchAccount/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const current = await Users.findOne({ where: { userId } });

    if (!current) {
      return res.status(404).json({
        message: "존재하지 않는 아이디입니다.",
      });
    }
    const savedTokenUser = await Tokens.findOne({ where: { UserId: current.userId } });
    try {
      jwt.verify(savedTokenUser.tokenId, process.env.JWT_SECRET_KEY);

      await Tokens.destroy({ where: { UserId: current.userId } });
      await Tokens.create({ tokenId: savedTokenUser.tokenId, UserId: current.userId });

      const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET_KEY, {
        expiresIn: "30m",
      });
      res.cookie("authorization", `Bearer ${accessToken}`);
      return res.status(200).json({
        accessToken,
        message: `${current.nickname} Account로 로그인 되었습니다.`,
      });
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        await Tokens.destroy({ where: { tokenId: savedTokenUser.tokenId } });
        return res.status(404).json({
          message: "refreshToken이 만료되었습니다. 다시 로그인해주세요",
        });
      }
    }
  } catch (err) {
    return res.status(400).json({
      message: "잘못된 접근입니다.",
    });
  }
});

// 로그아웃 기능
router.delete("/logout/:userId", async (req, res) => {
  const { userId } = req.params;
  const current = await Users.findOne({ where: { userId } });

  res.clearCookie("authorization");
  await Tokens.destroy({ where: { UserId: current.userId } });
  return res.status(200).json({
    message: `${current.nickname}님 로그아웃 되었습니다.`,
  });
});

module.exports = router;
