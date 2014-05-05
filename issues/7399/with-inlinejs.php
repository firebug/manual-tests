<?php

function printSource($sData, $sSource = NULL) {
  $sValues = '<dl>';
  $i = 0;
  if ( empty($sData) ) {
    $sValues .= '<dt>{{EMPTY}}</dt><dd></dd>';
  } else {
    foreach ($sData as $sKey => $sValue) {
      if ( is_null($sValue) ) {
        $sValues .= '<dt>{{NULL}}</dt><dd>Like... wat?</dd>';
      } elseif ( is_array($sValue) ) {
        $sValues .= printSource($sValue);
      } else {
        $sValues .= 
          '<dt>'.htmlentities($sKey, ENT_QUOTES).'</dt>'.
          '<dd>'.htmlentities($sValue, ENT_QUOTES).'</dd>';
      }

      // nach zehn Calls ist eigentlich alles gesagt...
      if ( ++$i == 10 ) {
        $sValues .= '<dt>...</dt><dd>...and so on...</dd>';
        break;
      }
    }
  }
  $sValues .= '</dl>';

  if ( is_null($sSource) ) {
    return $sValues;
  }
  return <<<PRN
  <article>
    <h1>{$sSource}</h1>
    {$sValues}
  </article>
PRN;
}


function printForm($sMethod) {
  $asKeys = ['random','name','values','are','for','testing','purposes','believe','dat'];
  mt_srand();
  $sKey = $asKeys[mt_rand(0,8)];

  $sAction = '';
  if ($sMethod === 'POST') {
    $sRand = $asKeys[mt_rand(0,8)];
    $sAction = '?randget='.$sRand;
  }

  return <<<FRM
  <article>
    <form method="{$sMethod}" action="{$sAction}">
      <h1>{$sMethod}</h1>
      <input type="text" name="{$sKey}">
      <input type="hidden" name="always" value="withyou">
    </form>
  </article>
FRM;
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Proof of Concept fb2.0b2</title>
  <link href="style.css"></link>

  <!-- top js for long loading times -->
  <script src="//code.jquery.com/jquery-2.1.0.min.js"></script>
</head>
<body>
  <!-- Also some lines for scroll interaction -->
  <!--

  Consectetur porro ad voluptates porro quam earum! A non unde.
  Elit possimus ipsum sequi elit mollitia. Ipsum culpa reiciendis molestias?
  Dolor perferendis ab tenetur alias quibusdam. Nihil sed quod delectus?
  Amet harum maiores libero recusandae earum qui. Non ratione odio.
  Elit error rem impedit tempora culpa non fugit iste quaerat.
  Amet totam enim in est eum dolorem excepturi iusto obcaecati.
  Elit asperiores fuga perferendis praesentium ullam. Hic natus quo quas.
  Lorem a doloremque saepe tempora libero temporibus deserunt alias. Beatae!
  Lorem nisi fugit accusamus enim numquam. Obcaecati maxime fuga vel!
  Ipsum praesentium ratione debitis et possimus id. Aperiam praesentium hic!
  Sit natus rem quis cupiditate alias reprehenderit quod quis sapiente?
  Amet obcaecati error totam placeat quas delectus maxime minus, quam.
  Adipisicing officia consequatur eos odio quisquam alias? Eaque qui a.
  Amet numquam tempore id velit at repudiandae totam facilis. Hic.
  Elit cumque natus accusamus accusantium id reprehenderit? Blanditiis illum distinctio.
  Consectetur fugit dolorum perferendis eligendi vero ipsum repellendus tempore? Omnis?
  Consectetur eius consectetur doloremque dolore dolorum vitae quod magni exercitationem.
  Dolor voluptatem perspiciatis eos eum illum odio. In nemo provident.
  Lorem temporibus dicta a quas neque architecto illum! Sapiente aliquid.
  Consectetur quos eius voluptate nulla earum sapiente atque. Quis facilis?
  Ipsum quaerat ad officiis eum molestias consectetur optio hic ducimus!
  Consectetur quaerat dolore expedita reprehenderit fugit. Molestias alias dolorum maiores?
  Ipsum omnis modi temporibus nobis nam nulla! Doloremque est veritatis.
  Elit labore recusandae sit aut ab voluptate aut eum. Consectetur!
  Elit labore earum unde veniam suscipit quia. Assumenda velit harum.
  Sit consequatur rerum laudantium repudiandae ratione nemo. Amet reprehenderit odit.
  Amet ducimus sint ducimus nulla non. Ea hic rem nisi!
  Adipisicing delectus et aliquid quas aperiam lorem! Distinctio placeat repellendus!
  Amet nam officiis aperiam deserunt exercitationem ut cum cumque? Reprehenderit.
  Lorem laboriosam culpa provident ex corporis voluptates, necessitatibus, facere. Officiis.
  Consectetur porro ad voluptates porro quam earum! A non unde.
  Elit possimus ipsum sequi elit mollitia. Ipsum culpa reiciendis molestias?
  Dolor perferendis ab tenetur alias quibusdam. Nihil sed quod delectus?
  Amet harum maiores libero recusandae earum qui. Non ratione odio.
  Elit error rem impedit tempora culpa non fugit iste quaerat.
  Amet totam enim in est eum dolorem excepturi iusto obcaecati.
  Elit asperiores fuga perferendis praesentium ullam. Hic natus quo quas.
  Lorem a doloremque saepe tempora libero temporibus deserunt alias. Beatae!
  Lorem nisi fugit accusamus enim numquam. Obcaecati maxime fuga vel!
  Ipsum praesentium ratione debitis et possimus id. Aperiam praesentium hic!
  Sit natus rem quis cupiditate alias reprehenderit quod quis sapiente?
  Amet obcaecati error totam placeat quas delectus maxime minus, quam.
  Adipisicing officia consequatur eos odio quisquam alias? Eaque qui a.
  Amet numquam tempore id velit at repudiandae totam facilis. Hic.
  Elit cumque natus accusamus accusantium id reprehenderit? Blanditiis illum distinctio.
  Consectetur fugit dolorum perferendis eligendi vero ipsum repellendus tempore? Omnis?
  Consectetur eius consectetur doloremque dolore dolorum vitae quod magni exercitationem.
  Dolor voluptatem perspiciatis eos eum illum odio. In nemo provident.
  Lorem temporibus dicta a quas neque architecto illum! Sapiente aliquid.
  Consectetur quos eius voluptate nulla earum sapiente atque. Quis facilis?
  Ipsum quaerat ad officiis eum molestias consectetur optio hic ducimus!
  Consectetur quaerat dolore expedita reprehenderit fugit. Molestias alias dolorum maiores?
  Ipsum omnis modi temporibus nobis nam nulla! Doloremque est veritatis.
  Elit labore recusandae sit aut ab voluptate aut eum. Consectetur!
  Elit labore earum unde veniam suscipit quia. Assumenda velit harum.
  Sit consequatur rerum laudantium repudiandae ratione nemo. Amet reprehenderit odit.
  Amet ducimus sint ducimus nulla non. Ea hic rem nisi!
  Adipisicing delectus et aliquid quas aperiam lorem! Distinctio placeat repellendus!
  Amet nam officiis aperiam deserunt exercitationem ut cum cumque? Reprehenderit.
  Lorem laboriosam culpa provident ex corporis voluptates, necessitatibus, facere. Officiis.
  Consectetur porro ad voluptates porro quam earum! A non unde.
  Elit possimus ipsum sequi elit mollitia. Ipsum culpa reiciendis molestias?
  Dolor perferendis ab tenetur alias quibusdam. Nihil sed quod delectus?
  Amet harum maiores libero recusandae earum qui. Non ratione odio.
  Elit error rem impedit tempora culpa non fugit iste quaerat.
  Amet totam enim in est eum dolorem excepturi iusto obcaecati.
  Elit asperiores fuga perferendis praesentium ullam. Hic natus quo quas.
  Lorem a doloremque saepe tempora libero temporibus deserunt alias. Beatae!
  Lorem nisi fugit accusamus enim numquam. Obcaecati maxime fuga vel!
  Ipsum praesentium ratione debitis et possimus id. Aperiam praesentium hic!
  Sit natus rem quis cupiditate alias reprehenderit quod quis sapiente?
  Amet obcaecati error totam placeat quas delectus maxime minus, quam.
  Adipisicing officia consequatur eos odio quisquam alias? Eaque qui a.
  Amet numquam tempore id velit at repudiandae totam facilis. Hic.
  Elit cumque natus accusamus accusantium id reprehenderit? Blanditiis illum distinctio.
  Consectetur fugit dolorum perferendis eligendi vero ipsum repellendus tempore? Omnis?
  Consectetur eius consectetur doloremque dolore dolorum vitae quod magni exercitationem.
  Dolor voluptatem perspiciatis eos eum illum odio. In nemo provident.
  Lorem temporibus dicta a quas neque architecto illum! Sapiente aliquid.
  Consectetur quos eius voluptate nulla earum sapiente atque. Quis facilis?
  Ipsum quaerat ad officiis eum molestias consectetur optio hic ducimus!
  Consectetur quaerat dolore expedita reprehenderit fugit. Molestias alias dolorum maiores?
  Ipsum omnis modi temporibus nobis nam nulla! Doloremque est veritatis.
  Elit labore recusandae sit aut ab voluptate aut eum. Consectetur!
  Elit labore earum unde veniam suscipit quia. Assumenda velit harum.
  Sit consequatur rerum laudantium repudiandae ratione nemo. Amet reprehenderit odit.
  Amet ducimus sint ducimus nulla non. Ea hic rem nisi!
  Adipisicing delectus et aliquid quas aperiam lorem! Distinctio placeat repellendus!
  Amet nam officiis aperiam deserunt exercitationem ut cum cumque? Reprehenderit.
  Lorem laboriosam culpa provident ex corporis voluptates, necessitatibus, facere. Officiis.
  Consectetur porro ad voluptates porro quam earum! A non unde.
  Elit possimus ipsum sequi elit mollitia. Ipsum culpa reiciendis molestias?
  Dolor perferendis ab tenetur alias quibusdam. Nihil sed quod delectus?
  Amet harum maiores libero recusandae earum qui. Non ratione odio.
  Elit error rem impedit tempora culpa non fugit iste quaerat.
  Amet totam enim in est eum dolorem excepturi iusto obcaecati.
  Elit asperiores fuga perferendis praesentium ullam. Hic natus quo quas.
  Lorem a doloremque saepe tempora libero temporibus deserunt alias. Beatae!
  Lorem nisi fugit accusamus enim numquam. Obcaecati maxime fuga vel!
  Ipsum praesentium ratione debitis et possimus id. Aperiam praesentium hic!
  Sit natus rem quis cupiditate alias reprehenderit quod quis sapiente?
  Amet obcaecati error totam placeat quas delectus maxime minus, quam.
  Adipisicing officia consequatur eos odio quisquam alias? Eaque qui a.
  Amet numquam tempore id velit at repudiandae totam facilis. Hic.
  Elit cumque natus accusamus accusantium id reprehenderit? Blanditiis illum distinctio.
  Consectetur fugit dolorum perferendis eligendi vero ipsum repellendus tempore? Omnis?
  Consectetur eius consectetur doloremque dolore dolorum vitae quod magni exercitationem.
  Dolor voluptatem perspiciatis eos eum illum odio. In nemo provident.
  Lorem temporibus dicta a quas neque architecto illum! Sapiente aliquid.
  Consectetur quos eius voluptate nulla earum sapiente atque. Quis facilis?
  Ipsum quaerat ad officiis eum molestias consectetur optio hic ducimus!
  Consectetur quaerat dolore expedita reprehenderit fugit. Molestias alias dolorum maiores?
  Ipsum omnis modi temporibus nobis nam nulla! Doloremque est veritatis.
  Elit labore recusandae sit aut ab voluptate aut eum. Consectetur!
  Elit labore earum unde veniam suscipit quia. Assumenda velit harum.
  Sit consequatur rerum laudantium repudiandae ratione nemo. Amet reprehenderit odit.
  Amet ducimus sint ducimus nulla non. Ea hic rem nisi!
  Adipisicing delectus et aliquid quas aperiam lorem! Distinctio placeat repellendus!
  Amet nam officiis aperiam deserunt exercitationem ut cum cumque? Reprehenderit.
  Lorem laboriosam culpa provident ex corporis voluptates, necessitatibus, facere. Officiis.
  -->
  <header>
    <h1>Proof of Concept fb2.0b2</h1>
  </header>
<script>
  (function(){
    console.log("my only reason to exist is to place the main file to the scripts tab :(");
  }());
</script>
  <main>
    <section>
      <h1>send form with enter</h1>
<?php
      echo printForm('GET');
      echo printForm('POST');
?>
    </section>
    <section>
      <h1>"print_r"</h1>
<?php
      echo printSource($_GET, '$_GET');
      echo printSource($_POST, '$_POST');
?>
    </section>
  </main>
  <script src="footer-source.js"></script>
</body>
</html>
