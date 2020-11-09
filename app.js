const express = require('express');
const app = express();
//const mysql = require('mysql');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const config = require('./config/config');
const PORT = process.env.PORT || 5000;

const {
  Client
} = require('pg');

const client = new Client({
  user: 'wpobiygbdpldpp', // DB のユーザー名を指定
  host: 'ec2-34-237-236-32.compute-1.amazonaws.com',
  database: 'd2etja7oiqd6v1',
  password: 'f96b2f796177a9e07035d146bef05d22e7c3b5e61175760ad4f836f9b9b1c200', // DB のパスワードを指定
  post: 5432
})

client.connect();

//本番用
const http = require('http');
//本番用


// Sequelize インスタンス
const sequelize = new Sequelize({
  dialect: 'mysql',
  //  timezone: '+09:00'
});


const passport = require('./auth');
const session = require('express-session');
const flash = require('connect-flash');
const {
  check,
  validationResult
} = require('express-validator');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const client = require('cheerio-httpcli');

//model
const User = require('./models').User;
const Follow = require('./models').Follow;
const Group = require('./models').Group;
const Group_map = require('./models').Group_map;
const Bookmark = require('./models').Bookmark;
const Tag = require('./models').Tag;
const Tag_map = require('./models').Tag_map;
const Timeline = require('./models').Timeline;
const TimelineFollow = require('./models').TimelineFollow;
const TimelineGroup = require('./models').TimelineGroup;
const TimelineTag = require('./models').TimelineTag;
const Test = require('./models').Test;

app.use(express.static('public'));

//暗号化につかうキー
const APP_KEY = 'YOUR-SECRET-KEY';


//ミドルウェア
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(cookieParser());
app.use(flash());
app.use(session({
  secret: 'YOUR-SECRET-STRING',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

const authMiddleware = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else if (req.cookies.remember_me) {
    const [rememberToken, hash] = req.cookies.remember_me.split('|');
    User.findAll({
      where: {
        rememberToken: rememberToken
      }
    }).then(users => {
      for (let i in users) {
        const user = users[i];
        const verifyingHash = crypto.createHmac('sha256', APP_KEY)
          .update(user.id + '-' + rememberToken)
          .digest('hex');
        if (hash === verifyingHash) {
          return req.login(user, () => {

            // セキュリティ的はここで remember_me を再度更新すべき

            next();
          });
        }
      }
      res.redirect(302, '/login');
    });
  } else {
    res.redirect(302, '/login');
  }
};

//const connection = mysql.createConnection({
//  host: 'localhost',
//  user: 'root',
//  password: 'ZgYddWr3FWP5',
//  database: 'asb',
//  timezone: "+09:00"
//});
//
//connection.connect((err) => {
//  if (err) {
//    console.log('error connecting: ' + err.stack);
//    return;
//  }
//  console.log('success');
//});

//-----------------------------------------//

//----------ログインここから----------//
app.get('/logout', (req, res) => {
  res.clearCookie('remember_me');
  req.logout();
  res.redirect('/login');
});

app.get('/login', (req, res) => {

  const errorMessage = req.flash('error').join('<br>');
  res.render('user/login.ejs', {
    errorMessage: errorMessage,
    correctMessage: '',
  });
});

app.post('/login',
  passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: true,
    badRequestMessage: '「メールアドレス」と「パスワード」は必須入力です。',
    correctMessage: ''
  }),
  (req, res, next) => {

    if (!req.body.remember) { // 次回もログインを省略しない場合

      res.clearCookie('remember_me');
      return next();

    }

    const user = req.user;
    const rememberToken = crypto.randomBytes(20).toString('hex'); // ランダムな文字列
    const hash = crypto.createHmac('sha256', APP_KEY)
      .update(user.id + '-' + rememberToken)
      .digest('hex');
    user.rememberToken = rememberToken;
    user.save();

    res.cookie('remember_me', rememberToken + '|' + hash, {
      path: '/',
      maxAge: 5 * 365 * 24 * 60 * 60 * 1000 // 5年
    });

    return next();

  },
  (req, res) => {

    res.redirect('/');

  }
);
//----------ログインここまで----------//

//----------新規登録ここから----------//

const registrationValidationRules = [
  check('name')
  .not().isEmpty().withMessage('この項目は必須入力です。')
  .isLength({
    min: 4,
    max: 20
  }).withMessage('4文字から20文字にしてください。')
  .trim()
  .escape(),
  check('email')
  .not().isEmpty().withMessage('この項目は必須入力です。')
  .isEmail().withMessage('有効なメールアドレス形式で指定してください。')
  .trim()
  .escape(),
  check('password')
  .not().isEmpty().withMessage('この項目は必須入力です。')
  .isLength({
    min: 8,
    max: 25
  }).withMessage('8文字から25文字にしてください。')
  .trim()
  .escape()
  .custom((value, {
    req
  }) => {
    if (req.body.password !== req.body.passwordConfirmation) {
      throw new Error('パスワード（確認）と一致しません。');
    }
    return true;
  })
];

app.get('/register', (req, res) => {
  res.render('user/register.ejs', {
    name: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    resultName: '',
    resultEmail: '',
    resultPassword: '',
    correctMessage: '',
  });
});

app.post('/register', registrationValidationRules, (req, res) => {

  const errors = validationResult(req);

  if (!errors.isEmpty()) {

    const errors_array = errors.array();
    const resultName = errors_array.find((v) => v.param === 'name');
    const resultEmail = errors_array.find((v) => v.param === 'email');
    const resultPassword = errors_array.find((v) => v.param === 'password');

    res.render('user/register.ejs', {
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirmation: req.body.passwordConfirmation,
      resultName: resultName,
      resultEmail: resultEmail,
      resultPassword: resultPassword,
      correctMessage: ''
    });

  } else {
    User.findOrCreate({
      where: {
        email: req.body.email
      },
      defaults: {
        name: req.body.name,
        email: req.body.email,
        password: bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8)),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }).then(([user, created]) => {
      if (created) {
        res.render('user/login.ejs', {
          correctMessage: '登録が成功しました',
          errorMessage: ''
        });
      } else {
        res.render('user/register.ejs', {
          name: req.body.name,
          email: req.body.email,
          password: req.body.password,
          passwordConfirmation: req.body.passwordConfirmation,
          resultName: '',
          resultEmail: '',
          resultPassword: '',
          correctMessage: '既に登録されています'
        });
      }
    });
  }


});
//----------新規登録ここまで----------//

app.get('/tag/:id', authMiddleware, (req, res) => {
  Bookmark.findAll({
    where: {
      '$bookmarkTags.id$': req.params.id,
      public: 1
    },
    include: [
      {
        model: Tag,
        as: 'bookmarkTags'
      }
    ],
    attributes: ['id']
  }).then(result1 => {

    const jsonIds = JSON.stringify(result1);
    const ids = JSON.parse(jsonIds);

    const bookmarkId = [];

    ids.forEach(id => {
      bookmarkId.push(id.id);
    });

    Bookmark.findAll({
      where: {
        id: {
          [Op.in]: bookmarkId
        }
      },
      order: [
            ['createdAt', 'DESC']],
      include: [
        {
          model: Tag,
          as: 'bookmarkTags'
        },
        {
          model: User,
          attributes: ['name', 'id']
        }
      ]
    }).then(result2 => {

      const jsonBookmarks = JSON.stringify(result2);
      const bookmarks = JSON.parse(jsonBookmarks);

      res.render('bookmark/index.ejs', {
        current_user: req.user,
        bookmarks: bookmarks
      });

    })
  });
});


app.get('/bookmark/create', authMiddleware, (req, res) => {

  Tag.findAll({
    attributes: ['name'],
    include: [
      {
        model: Tag_map,
        where: {
          user_id: req.user.id
        },
        attributes: ['createdAt']
      }
    ],
    order: [
      [Tag_map, 'createdAt', 'DESC']
    ]
  }).then(tags => {

    const jsonResult = JSON.stringify(tags);
    const results = JSON.parse(jsonResult);

    res.render('bookmark/create.ejs', {
      current_user: req.user,
      url: '',
      memo: '',
      tags: '',
      resultUrl: '',
      resultMemo: '',
      resultTags: '',
      public: '1',
      correctMessage: '',
      user_tags: results
    });

  });

});

const createUserValidationRules = [
  check('url')
  .not().isEmpty().withMessage('この項目は必須入力です。')
  .isURL({
    protocols: ['http', 'https', 'ftp'],
    require_protocol: false,
  }).withMessage('有効なURLを指定してください。')
  .isLength({
    min: 8,
    max: 200
  }).withMessage('8文字から200文字にしてください。')
  .trim(),
//  .escape(),
  check('memo')
  .isLength({
    min: 0,
    max: 40
  }).withMessage('40文字以内にしてください。')
  .trim()
  .escape(),
  check('tags')
    .trim()
    .escape(),
];

app.post('/bookmark/create', authMiddleware, createUserValidationRules, (req, expressResponse, next) => {

  const errors = validationResult(req);

  if (!errors.isEmpty()) {

    const errors_array = errors.array();
    const resultUrl = errors_array.find((v) => v.param === 'url');
    const resultMemo = errors_array.find((v) => v.param === 'memo');
    const resultTags = errors_array.find((v) => v.param === 'tags');

    Tag.findAll({
      attributes: ['name'],
      include: [
        {
          model: Tag_map,
          where: {
            user_id: req.user.id
          },
          attributes: ['createdAt']
        }
      ],
      order: [
        [Tag_map, 'createdAt', 'DESC']
      ]
    }).then(tags => {

      const jsonResult = JSON.stringify(tags);
      const results = JSON.parse(jsonResult);

      expressResponse.render('bookmark/create.ejs', {
        current_user: req.user,
        url: req.body.url,
        memo: req.body.memo,
        tags: req.body.tags,
        resultUrl: resultUrl,
        resultMemo: resultMemo,
        resultTags: resultTags,
        public: req.body.public,
        correctMessage: '',
        user_tags: results
      });

    });

  } else {

    const ogp = req.body.url;

    client.fetch(ogp, function (err, $, res, body) {
      if (err) {
        next(err)
        return;
      }

      const result = {
        exists: false,
        title: "",
        site_name: ""
      }

      const ogTitleQuery = $("meta[property='og:title']");

      if (ogTitleQuery.length > 0) {
        result.exists = true;
        result.title = $("meta[property='og:title']").attr("content");
        result.site_name = $("meta[property='og:site_name']").attr("content");
      } else {
        result.title = $("head title").text();
      }

      Bookmark.findOrCreate({
        where: {
          url: req.body.url,
          user_id: req.user.id
        },
        defaults: {
          url: req.body.url,
          title: result.title,
          site_name: result.site_name,
          memo: req.body.memo,
          public: req.body.public,
          user_id: req.user.id,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        raw: true
      }).then(([bookmark, created]) => {
        if (created) {

          if (req.body.tags) {

            const tags = req.body.tags;
            const rule = /\s+/;
            const tags_array = tags.split(rule);

            tags_array.forEach(tag => {

              Tag.findOrCreate({
                where: {
                  name: tag
                },
                defaults: {
                  name: tag,
                  createdAt: new Date(),
                  updatedAt: new Date()
                },
                raw: true
              }).then(([data, created]) => {

                Tag_map.findOrCreate({
                  where: {
                    tag_id: data.id,
                    bookmark_id: bookmark.id,
                    user_id: req.user.id
                  },
                  defaults: {
                    tag_id: data.id,
                    bookmark_id: bookmark.id,
                    user_id: req.user.id,
                    createdAt: new Date(),
                    updatedAt: new Date()
                  },
                  raw: true
                });
              });
            });

          }

          expressResponse.redirect('/bookmark/create');

        } else {

          Tag.findAll({
            attributes: ['name'],
            include: [
              {
                model: Tag_map,
                where: {
                  user_id: req.user.id
                },
                attributes: ['createdAt']
              }
            ],
            order: [
              [Tag_map, 'createdAt', 'DESC']
            ]
          }).then(tags => {

            const jsonResult = JSON.stringify(tags);
            const results = JSON.parse(jsonResult);

            expressResponse.render('bookmark/create.ejs', {
              current_user: req.user,
              url: req.body.url,
              memo: req.body.memo,
              tags: req.body.tags,
              resultUrl: '',
              resultMemo: '',
              resultTags: '',
              public: req.body.public,
              correctMessage: '既に登録されています',
              user_tags: results
            });

          });

        }

      });
    });
  }

});

app.post('/mybookmark/edit/:bookmark_id', authMiddleware, createUserValidationRules, (req, expressResponse, next) => {

  Bookmark.findOne({
    where: {
      id: req.params.bookmark_id
    },
    include: [
      {
        model: Tag,
        as: 'bookmarkTags'
      }
    ]
  }).then(bookmarkData => {

    const jsonBookmarks = JSON.stringify(bookmarkData);
    const user_bookmark = JSON.parse(jsonBookmarks);
    //bookmarkData変換

    if (user_bookmark.user_id === req.user.id) {

      Tag.findAll({
        attributes: ['name'],
        include: [
          {
            model: Tag_map,
            where: {
              user_id: req.user.id
            },
            attributes: ['createdAt']
          }
        ],
        order: [
          [Tag_map, 'createdAt', 'DESC']
        ]
      }).then(tags => {

        const jsonResult = JSON.stringify(tags);
        const results = JSON.parse(jsonResult);
        //user_tags定義

        const errors = validationResult(req);

        if (!errors.isEmpty()) {

          const errors_array = errors.array();
          const resultUrl = errors_array.find((v) => v.param === 'url');
          const resultMemo = errors_array.find((v) => v.param === 'memo');
          const resultTags = errors_array.find((v) => v.param === 'tags');

          expressResponse.render('bookmark/create.ejs', {
            current_user: req.user,
            user_bookmark: user_bookmark,
            url: req.body.url,
            memo: req.body.memo,
            tags: req.body.tags,
            resultUrl: resultUrl,
            resultMemo: resultMemo,
            resultTags: resultTags,
            public: req.body.public,
            correctMessage: '',
            user_tags: results
          });
          //validation通過失敗

        } else {

          const ogp = req.body.url;

          client.fetch(ogp, function (err, $, res, body) {
            if (err) {
              next(err)
              return;
            }

            const result = {
              exists: false,
              title: "",
              site_name: ""
            }

            const ogTitleQuery = $("meta[property='og:title']");

            if (ogTitleQuery.length > 0) {
              result.exists = true;
              result.title = $("meta[property='og:title']").attr("content");
              result.site_name = $("meta[property='og:site_name']").attr("content");
            } else {
              result.title = $("head title").text();
            }

            Bookmark.update({
              url: req.body.url,
              title: result.title,
              site_name: result.site_name,
              memo: req.body.memo,
              public: req.body.public,
              user_id: req.user.id
            }, {
              where: {
                id: user_bookmark.id
              }
            }).then(() => {

              Tag_map.destroy({
                where: {
                  bookmark_id: user_bookmark.id
                }
              }).then(() => {

                if (req.body.tags) {

                  const tags = req.body.tags;
                  const rule = /\s+/;
                  const tags_array = tags.split(rule);

                  tags_array.forEach(tag => {

                    Tag.findOrCreate({
                      where: {
                        name: tag
                      },
                      defaults: {
                        name: tag,
                        createdAt: new Date(),
                        updatedAt: new Date()
                      },
                      raw: true
                    }).then(data => {
                      Tag_map.findOrCreate({
                        where: {
                          tag_id: data[0].id,
                          bookmark_id: user_bookmark.id,
                          user_id: req.user.id
                        },
                        defaults: {
                          tag_id: data[0].id,
                          bookmark_id: user_bookmark.id,
                          user_id: req.user.id,
                          createdAt: new Date(),
                          updatedAt: new Date()
                        },
                        raw: true
                      });

                      //Tag作成チェック
                    });
                    //繰り返し処理
                  });

                }

                expressResponse.redirect('/mybookmark');

                //Tag_mapリセット
              });

              //Bookmark更新
            });

            //fetchここまで
          });

          //validation通過成功
        }
        //user_tag取得
      });

    } else {
      expressResponse.redirect('/mybookmark');
      //ifブックマークユーザーチェック
    }

    //bookmark.findOne
  });
});

app.get('/mybookmark/edit/:bookmark_id', authMiddleware, (req, res) => {

  Bookmark.findOne({
    where: {
      id: req.params.bookmark_id
    },
    include: [
      {
        model: Tag,
        as: 'bookmarkTags'
      }
    ]
  }).then(bookmarkData => {

    Tag.findAll({
      attributes: ['name'],
      include: [
        {
          model: Tag_map,
          where: {
            user_id: req.user.id
          },
          attributes: ['createdAt']
        }
      ],
      order: [
        [Tag_map, 'createdAt', 'DESC']
      ]
    }).then(tags => {

      const jsonResult = JSON.stringify(tags);
      const results = JSON.parse(jsonResult);

      const jsonBookmarks = JSON.stringify(bookmarkData);
      const user_bookmark = JSON.parse(jsonBookmarks);
      let tag = ''

      user_bookmark.bookmarkTags.forEach(bookmarkTag => {
        tag = tag + bookmarkTag.name + ' ';
      });

      if (user_bookmark.user_id === req.user.id) {

        const publicString = user_bookmark.public + ''

        res.render('bookmark/edit.ejs', {
          current_user: req.user,
          user_bookmark: user_bookmark,
          url: user_bookmark.url,
          memo: user_bookmark.memo,
          tags: tag,
          resultUrl: '',
          resultMemo: '',
          resultTags: '',
          public: publicString,
          correctMessage: '',
          user_tags: results
        });

      } else {
        res.redirect('/mybookmark');
      }

    });
  });

});

app.post('/mybookmark/delete/:bookmark_id', authMiddleware, (req, res) => {

  Bookmark.findOne({
    where: {
      id: req.params.bookmark_id
    },
    include: [
      {
        model: Tag,
        as: 'bookmarkTags'
      }
    ]
  }).then(delBookmark => {

    const jsonBookmarks = JSON.stringify(delBookmark);
    const user_bookmark = JSON.parse(jsonBookmarks);

    if (user_bookmark.user_id === req.user.id) {

      Tag_map.destroy({
        where: {
          bookmark_id: user_bookmark.id
        },
        raw: true
      }).then(() => {
        delBookmark.destroy();
        res.redirect('/mybookmark');
      });

    } else {
      res.redirect('/mybookmark');
    }

  });
});

app.get('/mybookmark/delete/:bookmark_id', authMiddleware, (req, res) => {

  Bookmark.findOne({
    where: {
      id: req.params.bookmark_id
    },
    include: [
      {
        model: Tag,
        as: 'bookmarkTags'
      }
    ]
  }).then(result => {

    const jsonBookmarks = JSON.stringify(result);
    const user_bookmark = JSON.parse(jsonBookmarks);

    if (user_bookmark.user_id === req.user.id) {

      res.render('bookmark/delete.ejs', {
        current_user: req.user,
        user_bookmark: user_bookmark
      });

    } else {
      res.redirect('/mybookmark');
    }

  });
});

app.get('/mybookmark', authMiddleware, (req, res) => {

  Bookmark.findAll({
    where: {
      user_id: req.user.id
    },
    order: [
      ['createdAt', 'DESC']
    ],
    include: [
      {
        model: Tag,
        as: 'bookmarkTags'
      }
    ]
  }).then(result => {

    const jsonBookmarks = JSON.stringify(result);
    const user_bookmarks = JSON.parse(jsonBookmarks);

    res.render('bookmark/mybookmark.ejs', {
      current_user: req.user,
      user_bookmarks: user_bookmarks
    });

  });
});

app.post('/follow/remove/:id', authMiddleware, (req, res) => {

  Follow.findOne({
    where: {
      followedUser_id: req.params.id,
      user_id: req.user.id
    }
  }).then(follow => {

    follow.destroy();
    res.redirect('/user/' + req.user.id);

  });

});

app.post('/follow/add/:user_id', authMiddleware, (req, res) => {

  Follow.findOrCreate({
    where: {
      followedUser_id: req.params.user_id,
      user_id: req.user.id
    },
    defaults: {
      followedUser_id: req.params.user_id,
      //フォローされた人
      user_id: req.user.id,
      //フォローした人
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }).then(() => {

    res.redirect('/user/' + req.params.user_id);

  });

});

const createGroupValidationRules = [
  check('name')
  .not().isEmpty().withMessage('この項目は必須入力です。')
  .isLength({
    min: 4,
    max: 40
  }).withMessage('4文字から40文字にしてください。')
  .trim()
  .escape(),
  check('memo')
  .isLength({
    min: 0,
    max: 200
  }).withMessage('200文字以内にしてください。')
  .trim()
  .escape(),
];

app.post('/group/create', authMiddleware, createGroupValidationRules, (req, res) => {

  const errors = validationResult(req);

  if (!errors.isEmpty()) {

    const errors_array = errors.array();
    const resultName = errors_array.find((v) => v.param === 'name');
    const resultMemo = errors_array.find((v) => v.param === 'memo');

    res.render('group/create.ejs', {
      current_user: req.user,
      name: req.body.name,
      memo: req.body.memo,
      resultName: resultName,
      resultMemo: resultMemo,
      correctMessage: ''
    });
    //validation通過失敗

  } else {

    Group.findOrCreate({
      where: {
        name: req.body.name
      },
      defaults: { // 新規登録するデータ
        name: req.body.name,
        memo: req.body.memo,
        owner: req.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }).then(([group, created]) => {

      if (created) { // データが新規作成された場合

        Group_map.create({
          group_id: group.id,
          user_id: req.user.id
        }).then(group_map => {

          res.redirect('/group/' + group.id);

        });

      } else {

        res.render('group/create.ejs', {
          current_user: req.user,
          name: req.body.name,
          memo: req.body.memo,
          resultName: '',
          resultMemo: '',
          correctMessage: '既に登録されています'
        });

      }

    });

  }

});

app.post('/group/dismiss/:id', authMiddleware, (req, res) => {

  Group.destroy({
    where: {
      id: req.params.id,
      owner: req.user.id
    }
  }).then(() => {

    Group_map.destroy({
      where: {
        group_id: req.params.id,
      }
    }).then(() => {

      res.redirect('/user/' + req.user.id);

    });
  });
});

app.post('/group/leave/:id', authMiddleware, (req, res) => {

  Group_map.destroy({
    where: {
      group_id: req.params.id,
      user_id: req.user.id
    }
  }).then(() => {

    res.redirect('/group/' + req.params.id);

  });

});

app.post('/group/join/:id', authMiddleware, (req, res) => {

  Group_map.create({
    user_id: req.user.id,
    group_id: req.params.id,
    createdAt: new Date(),
    updatedAt: new Date()
  }).then(group => {

    res.redirect('/group/' + req.params.id);

  });

});

app.get('/group/create', authMiddleware, (req, res) => {

  res.render('group/create.ejs', {
    current_user: req.user,
    name: '',
    memo: '',
    resultName: '',
    resultMemo: '',
    correctMessage: ''
  });

});

app.get('/group/:id', authMiddleware, (req, res) => {

  Group.findAll({
    where: {
      id: req.params.id
    },
    include: [
      {
        model: Group_map
      },
      {
        model: User,
        attributes: ['name', 'id']
      },
    ]
  }).then(result1 => {

    const jsonGroups = JSON.stringify(result1);
    const group = JSON.parse(jsonGroups);

    Group_map.count({
      where: {
        group_id: req.params.id
      }
    }).then(groupCount => {

      Group_map.findOne({
        where: {
          user_id: req.user.id,
          group_id: req.params.id
        },
        raw: true
      }).then(result2 => {

        res.render('group/show.ejs', {
          current_user: req.user,
          groupCount: groupCount,
          group: group[0],
          addGroup: result2
        });

      });
    });
  });
});

app.post('/timeline/delete/:id', authMiddleware, (req, res) => {

  Timeline.findOne({
    where: {
      number: req.params.id,
      owner_id: req.user.id,
    },
  }).then(timeline => {

    TimelineFollow.destroy({
      where: {
        timeline_id: timeline.id
      }
    });

    TimelineGroup.destroy({
      where: {
        timeline_id: timeline.id
      }
    });

    TimelineTag.destroy({
      where: {
        timeline_id: timeline.id
      }
    });

    timeline.destroy();

  }).then(() => {

    Timeline.count({
      where: {
        owner_id: req.user.id,
      }
    }).then(timelineCount => {

      Timeline.findAll({
        where: {
          owner_id: req.user.id,
        },
        order: [
          ['createdAt', 'ASC']
        ]
      }).then(result => {

        const jsonTimeline = JSON.stringify(result);
        const timelines = JSON.parse(jsonTimeline);

        const id_array = []

        timelines.forEach(timeline => {
          id_array.push(timeline.id);
        });

        for (let i = 0; i < timelineCount; i++) {

          Timeline.update({
            number: i + 1
          }, {
            where: {
              id: id_array[i]
            }
          });

        }

      }).then(() => {
        res.redirect('/');
      })

    });


  });

});

app.get('/timeline/list', authMiddleware, (req, res) => {

  Timeline.max('number', {
    where: {
      owner_id: req.user.id
    }
  }).then(maxNumber => {

    if (maxNumber) {

      const timeline = {};

      let promise = Promise.resolve();

      for (let i = 1; i < maxNumber + 1; i++) {
        promise = promise.then(() => {

          timeline[i] = {};
          timeline[i].name = [];
          timeline[i].tags = [];
          timeline[i].groups = [];
          timeline[i].follows = [];

          Timeline.findAll({
            where: {
              owner_id: req.user.id,
              number: i
            }
          }).then(result1 => {

            const jsonName = JSON.stringify(result1);
            const name = JSON.parse(jsonName);

            timeline[i].name = name[0].name;

          }).then(() => {

            TimelineTag.findAll({
              include: [
                {
                  model: Timeline,
                  where: {
                    number: i,
                    owner_id: req.user.id
                  }
                }
              ]
            }).then(result2 => {

              const jsonTag = JSON.stringify(result2);
              const tags = JSON.parse(jsonTag);

              tags.forEach(tag => {
                timeline[i].tags.push(tag.tag_name);
              });

            }).then(() => {

              TimelineGroup.findAll({
                attributes: ['group_name'],
                include: [
                  {
                    model: Timeline,
                    where: {
                      number: i,
                      owner_id: req.user.id
                    }
                  }
                ]
              }).then(result3 => {

                const jsonGroup = JSON.stringify(result3);
                const groups = JSON.parse(jsonGroup);

                groups.forEach(group => {
                  timeline[i].groups.push(group);
                });

              }).then(() => {

                TimelineFollow.findAll({
                  attributes: ['followedUser_name'],
                  include: [
                    {
                      model: Timeline,
                      where: {
                        number: i,
                        owner_id: req.user.id
                      }
                    }
                  ]
                }).then(result4 => {

                  const jsonFollow = JSON.stringify(result4);
                  const follows = JSON.parse(jsonFollow);

                  follows.forEach(follow => {
                    timeline[i].follows.push(follow);
                  });

                  if (i === maxNumber) {

                    res.render('timeline/list.ejs', {
                      //渡す値
                      current_user: req.user,
                      max_number: maxNumber,
                      timeline: timeline
                    });

                  }
                });
              });
            });
          });
        });

      } //numberの数だけループ

    } else {
      //一つもタイムラインを登録してない時
      res.render('timeline/index.ejs', {
        //渡す値
        current_user: req.user,
        max_number: 0,
        timeline: ''
      });
    }
  }); //maxNumberを取得
});

app.get('/timeline/create/:id', authMiddleware, (req, res) => {

  Group.findAll({
    include: [
      {
        model: Group_map,
        where: {
          user_id: req.user.id,
        },
      }
    ]
  }).then(result1 => {

    const jsonGroups = JSON.stringify(result1);
    const groups = JSON.parse(jsonGroups);

    Follow.findAll({
      where: {
        user_id: req.user.id
      },
      include: [
        {
          model: User,
          attributes: ['name', 'id']
        }
      ]
    }).then(result2 => {

      const jsonFollows = JSON.stringify(result2);
      const follows = JSON.parse(jsonFollows);

      Tag.findAll({
        attributes: ['name'],
        include: [
          {
            model: Tag_map,
            where: {
              user_id: req.user.id
            }
          }
        ]
      }).then(result3 => {

        const jsonTags = JSON.stringify(result3);
        const tags = JSON.parse(jsonTags);

        res.render('timeline/create.ejs', {
          current_user: req.user,
          groups: groups,
          follows: follows,
          tags: tags,
          resultName: '',
          resultTags: '',
          params: req.params.id
        });

      });
    });
  });

});

const createTimelineValidationRules = [
  check('name')
  .not().isEmpty().withMessage('この項目は必須入力です。')
  .isLength({
    min: 2,
    max: 20
  }).withMessage('2文字から15文字にしてください。')
  .trim()
  .escape(),
  check('tags')
  .trim()
  .escape(),
];

app.post('/timeline/create/:id', authMiddleware, createTimelineValidationRules, (req, res) => {

  const errors = validationResult(req);

  if (!errors.isEmpty()) {

    Group.findAll({
      include: [
        {
          model: Group_map,
          where: {
            user_id: req.user.id,
          },
        }
      ]
    }).then(result1 => {

      const jsonGroups = JSON.stringify(result1);
      const groups = JSON.parse(jsonGroups);

      Follow.findAll({
        where: {
          user_id: req.user.id
        },
        include: [
          {
            model: User,
            attributes: ['name', 'id']
          }
        ]
      }).then(result2 => {

        const jsonFollows = JSON.stringify(result2);
        const follows = JSON.parse(jsonFollows);

        Tag.findAll({
          attributes: ['name'],
          include: [
            {
              model: Tag_map,
              where: {
                user_id: req.user.id
              }
            }
          ]
        }).then(result3 => {

          const jsonTags = JSON.stringify(result3);
          const tags = JSON.parse(jsonTags);

          const errors_array = errors.array();
          const resultName = errors_array.find((v) => v.param === 'name');
          const resultTags = errors_array.find((v) => v.param === 'tags');

          res.render('timeline/create.ejs', {
            current_user: req.user,
            groups: groups,
            follows: follows,
            tags: tags,
            resultName: resultName,
            resultTags: resultTags,
            params: req.params.id
          });
          //validation通過失敗

        });
      });
    });

  } else {

    Timeline.findOrCreate({
      where: {
        number: req.params.id,
        owner_id: req.user.id,
      },
      defaults: {
        name: req.body.name,
        number: req.params.id,
        owner_id: req.user.id
      }
    }).then(([timeLine, created]) => {

      if (created) {

        if (req.body.tags) {

          const tags = req.body.tags;
          const rule = /\s+/;
          const tags_array = tags.split(rule);

          tags_array.forEach(tag => {

            Tag.findAll({
              where: {
                name: tag
              }
            }).then(result => {

              const jsonTag = JSON.stringify(result);
              const tagId_array = JSON.parse(jsonTag);

              tagId_array.forEach(tagId => {
                TimelineTag.create({
                  timeline_id: timeLine.id,
                  user_id: req.user.id,
                  tag_id: tagId.id,
                  tag_name: tagId.name,
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
              });
            });

          }); //tagループ終了

        } //-----TimelineTag登録-----

        if (req.body.groups) {

          for (let i = 0; i < req.body.groups.length; i++) {

            Group.findOne({
              where: {
                id: req.body.groups[i],
              }
            }).then(result => {

              const jsonGroup = JSON.stringify(result);
              const group = JSON.parse(jsonGroup);

              TimelineGroup.create({
                timeline_id: timeLine.id,
                user_id: req.user.id,
                group_id: req.body.groups[i],
                group_name: group.name,
                createdAt: new Date(),
                updatedAt: new Date()
              });

            });
          }

        } //-----TimelineGroup登録-----

        if (req.body.follows) {

          for (let i = 0; i < req.body.follows.length; i++) {

            User.findOne({
              where: {
                id: req.body.follows[i]
              }
            }).then(result => {

              const jsonFollow = JSON.stringify(result);
              const follow = JSON.parse(jsonFollow);

              TimelineFollow.create({
                timeline_id: timeLine.id,
                user_id: req.user.id,
                followedUser_id: req.body.follows[i],
                followedUser_name: follow.name,
                createdAt: new Date(),
                updatedAt: new Date()
              });

            });
          }

        } //-----TimelineFollow登録-----

        res.redirect('/');

      } else {
        res.redirect('/');
      }
    });
  }
});

app.get('/timeline/edit/:id', authMiddleware, (req, res) => {

  Group.findAll({
    include: [
      {
        model: Group_map,
        where: {
          user_id: req.user.id,
        },
      }
    ]
  }).then(result1 => {

    const jsonGroups = JSON.stringify(result1);
    const groups = JSON.parse(jsonGroups);

    Follow.findAll({
      where: {
        user_id: req.user.id
      },
      include: [
        {
          model: User,
          attributes: ['name', 'id']
        }
      ]
    }).then(result2 => {

      const jsonFollows = JSON.stringify(result2);
      const follows = JSON.parse(jsonFollows);

      Tag.findAll({
        attributes: ['name'],
        include: [
          {
            model: Tag_map,
            where: {
              user_id: req.user.id
            }
          }
        ]
      }).then(result3 => {

        const jsonTags = JSON.stringify(result3);
        const tags = JSON.parse(jsonTags);

        res.render('timeline/edit.ejs', {
          current_user: req.user,
          groups: groups,
          follows: follows,
          tags: tags,
          resultName: '',
          resultTags: '',
          params: req.params.id
        });

      });
    });
  });

});

app.post('/timeline/edit/:id', authMiddleware, createTimelineValidationRules, (req, res) => {

  const errors = validationResult(req);

  if (!errors.isEmpty()) {

    Group.findAll({
      include: [
        {
          model: Group_map,
          where: {
            user_id: req.user.id,
          },
        }
      ]
    }).then(result1 => {

      const jsonGroups = JSON.stringify(result1);
      const groups = JSON.parse(jsonGroups);

      Follow.findAll({
        where: {
          user_id: req.user.id
        },
        include: [
          {
            model: User,
            attributes: ['name', 'id']
          }
        ]
      }).then(result2 => {

        const jsonFollows = JSON.stringify(result2);
        const follows = JSON.parse(jsonFollows);

        Tag.findAll({
          attributes: ['name'],
          include: [
            {
              model: Tag_map,
              where: {
                user_id: req.user.id
              }
            }
          ]
        }).then(result3 => {

          const jsonTags = JSON.stringify(result3);
          const tags = JSON.parse(jsonTags);

          const errors_array = errors.array();
          const resultName = errors_array.find((v) => v.param === 'name');
          const resultTags = errors_array.find((v) => v.param === 'tags');

          res.render('timeline/create.ejs', {
            current_user: req.user,
            groups: groups,
            follows: follows,
            tags: tags,
            resultName: resultName,
            resultTags: resultTags,
            params: req.params.id
          });
          //validation通過失敗

        });
      });
    });

  } else {

    Timeline.findOne({
      where: {
        number: req.params.id,
        owner_id: req.user.id,
      },
    }).then(timeline => {

      timeline.name = req.body.name;
      timeline.save();

      TimelineFollow.destroy({
        where: {
          timeline_id: timeline.id
        }
      });

      TimelineGroup.destroy({
        where: {
          timeline_id: timeline.id
        }
      });

      TimelineTag.destroy({
        where: {
          timeline_id: timeline.id
        }
      });

    }).then(() => {

      Timeline.findOne({
        where: {
          number: req.params.id,
          owner_id: req.user.id,
        },
      }).then(timeline => {

        if (req.body.tags) {

          const tags = req.body.tags;
          const rule = /\s+/;
          const tags_array = tags.split(rule);

          tags_array.forEach(tag => {

            Tag.findOrCreate({
              where: {
                name: tag
              },
              defaults: {
                name: tag,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            }).then(([result, created]) => {

              const jsonTag = JSON.stringify(result);
              const tagId = JSON.parse(jsonTag);

              TimelineTag.create({
                timeline_id: timeline.id,
                user_id: req.user.id,
                tag_id: tagId.id,
                tag_name: tagId.name,
                createdAt: new Date(),
                updatedAt: new Date()
              });
            });

          }); //tagループ終了

        } //-----TimelineTag登録-----

        if (req.body.groups) {

          for (let i = 0; i < req.body.groups.length; i++) {

            Group.findOne({
              where: {
                id: req.body.groups[i],
              }
            }).then(result => {

              const jsonGroup = JSON.stringify(result);
              const group = JSON.parse(jsonGroup);

              TimelineGroup.create({
                timeline_id: timeline.id,
                user_id: req.user.id,
                group_id: req.body.groups[i],
                group_name: group.name,
                createdAt: new Date(),
                updatedAt: new Date()
              });

            });
          }

        } //-----TimelineGroup登録-----

        if (req.body.follows) {

          for (let i = 0; i < req.body.follows.length; i++) {

            User.findOne({
              where: {
                id: req.body.follows[i]
              }
            }).then(result => {

              const jsonFollow = JSON.stringify(result);
              const follow = JSON.parse(jsonFollow);

              TimelineFollow.create({
                timeline_id: timeline.id,
                user_id: req.user.id,
                followedUser_id: req.body.follows[i],
                followedUser_name: follow.name,
                createdAt: new Date(),
                updatedAt: new Date()
              });

            });
          }

        }

      });

    }).then(() => {
      res.redirect('/');
    });
  }
});

app.get('/user/bookmark/:id', authMiddleware, (req, res) => {
  Bookmark.findAll({
    where: {
      user_id: req.params.id,
      public: 1
    },
    order: [
      ['createdAt', 'DESC']],
    include: [
      {
        model: Tag,
        as: 'bookmarkTags'
      },
      {
        model: User,
        attributes: ['name', 'id']
      }
    ]
  }).then(result1 => {

    const jsonBookmarks = JSON.stringify(result1);
    const bookmarks = JSON.parse(jsonBookmarks);

    res.render('bookmark/index.ejs', {
      current_user: req.user,
      bookmarks: bookmarks
    });

  });
});

app.post('/user/:id/edit', authMiddleware, registrationValidationRules, (req, res) => {

  User.update({
    name: req.body.name
  }, {
    where: {
      id: req.params.id
    }
  }).then(() => {
    User.findByPk(req.user.id).then(user => {
      req.login(user, () => res.redirect('/user/' + req.user.id));
    });
  });
});

app.get('/user/:id', authMiddleware, (req, res) => {

  const result = String(req.user.id);

  User.findByPk(req.params.id).then(user => {

    if (req.params.id === result) {

      //ブックマーク数チェック
      Bookmark.count({
        where: {
          user_id: req.user.id
        }
      }).then(dataCount => {

        //フォロー数チェック
        Follow.count({
          where: {
            user_id: req.params.id,
          }
        }).then(followCount => {

          //フォローリストチェック
          Follow.findAll({
            where: {
              user_id: req.params.id
            },
            include: [
              {
                model: User,
                attributes: ['name', 'id']
              }
            ]
          }).then(result1 => {

            const jsonFollowLists = JSON.stringify(result1);
            const followLists = JSON.parse(jsonFollowLists);

            Group_map.count({
              where: {
                user_id: req.params.id,
              }
            }).then(groupCount => {

              Group.findAll({
                include: [
                  {
                    model: Group_map,
                    where: {
                      user_id: req.params.id,
                    },
                  },
                  {
                    model: User,
                    attributes: ['name', 'id']
                  },
                ]
              }).then(result2 => {

                const jsonGroups = JSON.stringify(result2);
                const groupLists = JSON.parse(jsonGroups);

                res.render('user/mypage.ejs', {
                  current_user: req.user,
                  bookmarkCount: dataCount,
                  followCount: followCount,
                  followLists: followLists,
                  groupCount: groupCount,
                  groupLists: groupLists
                });

              });
            });
          });
        });

      });

    } else if (user) {

      //ブックマーク数チェック
      Bookmark.count({
        where: {
          user_id: req.params.id,
          public: 1
        }
      }).then(bookmarkCount => {

        //フォロー数チェック
        Follow.count({
          where: {
            user_id: req.params.id,
          }
        }).then(followCount => {

          //フォロー済みかチェック
          Follow.findOne({
            where: {
              followedUser_id: req.params.id,
              user_id: req.user.id
            }
          }).then(result1 => {

            const jsonFollowCheck = JSON.stringify(result1);
            const followCheck = JSON.parse(jsonFollowCheck);

            //フォローリストチェック
            Follow.findAll({
              where: {
                user_id: req.params.id
              },
              include: [
                {
                  model: User,
                  attributes: ['name', 'id']
                }
              ]
            }).then(result2 => {

              const jsonFollowLists = JSON.stringify(result2);
              const followLists = JSON.parse(jsonFollowLists);

              Group_map.count({
                where: {
                  user_id: req.params.id,
                }
              }).then(groupCount => {

                Group.findAll({
                  include: [
                    {
                      model: Group_map,
                      where: {
                        user_id: req.params.id,
                      },
                    },
                    {
                      model: User,
                      attributes: ['name', 'id']
                    },
                  ]
                }).then(result3 => {

                  const jsonGroups = JSON.stringify(result3);
                  const groupLists = JSON.parse(jsonGroups);

                  res.render('user/show.ejs', {
                    current_user: req.user,
                    other_user: user,
                    bookmarkCount: bookmarkCount,
                    followCount: followCount,
                    followCheck: followCheck,
                    followLists: followLists,
                    groupCount: groupCount,
                    groupLists: groupLists
                  });

                });
              });
            });
          });
        });
      });

    } else {

      //ブックマーク数チェック
      Bookmark.count({
        where: {
          user_id: req.user.id
        }
      }).then(dataCount => {

        //フォロー数チェック
        Follow.count({
          where: {
            user_id: req.params.id,
          }
        }).then(followCount => {

          //フォローリストチェック
          Follow.findAll({
            where: {
              user_id: req.params.id
            },
            include: [
              {
                model: User,
                attributes: ['name', 'id']
              }
            ]
          }).then(result1 => {

            const jsonFollowLists = JSON.stringify(result1);
            const followLists = JSON.parse(jsonFollowLists);

            Group_map.count({
              where: {
                user_id: req.params.id,
              }
            }).then(groupCount => {

              Group.findAll({
                include: [
                  {
                    model: Group_map,
                    where: {
                      user_id: req.params.id,
                    },
                  },
                  {
                    model: User,
                    attributes: ['name', 'id']
                  },
                ]
              }).then(result2 => {

                const jsonGroups = JSON.stringify(result2);
                const groupLists = JSON.parse(jsonGroups);

                res.render('user/mypage.ejs', {
                  current_user: req.user,
                  bookmarkCount: dataCount,
                  followCount: followCount,
                  followLists: followLists,
                  groupCount: groupCount,
                  groupLists: groupLists
                });

              });
            });
          });
        });

      });
    }

  });
});

app.get('/', authMiddleware, (req, res) => {

  Timeline.max('number', {
    where: {
      owner_id: req.user.id
    }
  }).then(maxNumber => {

    if (maxNumber) {

      const timeline = {};

      let promise = Promise.resolve();

      for (let i = 1; i < maxNumber + 1; i++) {
        promise = promise.then(() => {

          timeline[i] = {};
          timeline[i].bookmark_id = [];
          timeline[i].user_id = [];
          timeline[i].bookmark = [];

          //TimelineTagからbookmark_idを取得する

          TimelineTag.findAll({

            include: [
              {
                model: Tag_map,
                attributes: ['bookmark_id']
              },
              {
                model: Timeline,
                where: {
                  number: i,
                  owner_id: req.user.id
                }
              }
            ],
            group: 'Tag_map.bookmark_id'
          }).then(result1 => {

            const jsonTags = JSON.stringify(result1);
            const tags = JSON.parse(jsonTags);

            tags.forEach(tag => {
              if (tag.Tag_map) {
                timeline[i].bookmark_id.push(tag.Tag_map.bookmark_id);
              }
            });

          }).then(() => {

            //TimelineGroupからuser_idを取得する

            TimelineGroup.findAll({
              include: [
                {
                  model: Group_map,
                  attributes: ['user_id']
                },
                {
                  model: Timeline,
                  where: {
                    number: i,
                    owner_id: req.user.id
                  }
                }
          ],
              group: 'Group_map.user_id'
            }).then(result2 => {

              const jsonGroups = JSON.stringify(result2);
              const groups = JSON.parse(jsonGroups);

              groups.forEach(group => {
                timeline[i].user_id.push(group.Group_map.user_id);
              });


            }).then(() => {

              //TimelineFollowからuser_idを取得する

              TimelineFollow.findAll({
                include: [
                  {
                    model: Timeline,
                    where: {
                      number: i,
                      owner_id: req.user.id
                    }
                  }
                ],
                group: 'followedUser_id'
              }).then(result3 => {

                const jsonFollows = JSON.stringify(result3);
                const follows = JSON.parse(jsonFollows);

                follows.forEach(follow => {
                  timeline[i].user_id.push(follow.followedUser_id);
                });

              }).then(() => {

                //Bookmarkテーブルから条件に合うブックマークを取得

                Bookmark.findAll({
                  where: {
                    user_id: {
                      [Op.ne]: req.user.id
                    },
                    [Op.or]: {
                      id: timeline[i].bookmark_id,
                      user_id: timeline[i].user_id
                    },
                    public: 1
                  },
                  include: [
                    {
                      model: Tag,
                      as: 'bookmarkTags'
                    },
                    {
                      model: User,
                      attributes: ['name', 'id']
                    }
                  ],
                  order: [
                    ['createdAt', 'DESC']
                  ]
                }).then(result4 => {

                  const jsonBookmarks = JSON.stringify(result4);
                  const bookmarks = JSON.parse(jsonBookmarks);

                  timeline[i].bookmark = bookmarks;

                }).then(() => {

                  if (i === maxNumber) {

                    res.render('timeline/index.ejs', {
                      //渡す値
                      current_user: req.user,
                      max_number: maxNumber,
                      timeline: timeline
                    });

                  }

                });

              }); //TimelineFollowからuser_idを取得する
            }); //TimelineGroupからuser_idを取得する
          }); //TimelineTagからbookmark_idを取得する

        });

      } //numberの数だけループ

    } else {
      //一つもタイムラインを登録してない時
      res.render('timeline/index.ejs', {
        //渡す値
        current_user: req.user,
        max_number: 0,
        timeline: ''
      });
    }
  }); //maxNumberを取得
});

//
app.listen(process.env.PORT, process.env.IP);
//本番用

//
//app.listen(3000);
//開発用
