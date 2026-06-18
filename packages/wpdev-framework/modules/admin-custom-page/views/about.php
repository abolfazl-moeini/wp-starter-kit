<?php
/**
 * About view.
 *
 * @since 2.0.0
 */
?>

<style>
.wpdev-about-content a {
	text-decoration: none;
	font-weight: 500;
	color: #333;
}



.wpdev-about-content a::after {
	content: "↖︎";
	transform: scale(-0.7, 0.7);
	display: inline-block;
}
</style>

<a class="wpdev-fixed wpdev-inline-block wpdev-bottom-0 wpdev-left-1/2 wpdev-transform wpdev--translate-x-1/2 wpdev-bg-white wpdev-p-4 wpdev-rounded-full wpdev-shadow wpdev-m-4 wpdev-no-underline wpdev-z-10 wpdev-border-gray-300 wpdev-border-solid wpdev-border" href="<?php echo esc_attr(network_admin_url()); ?>">
  <?php _e('&larr; Back to the Dashboard', 'wpdev'); ?>
</a>
<div id="wpdev-wrap" class="wrap wpdev-about-content">

  <div style="max-width: 730px;" class="wpdev-max-w-screen-md wpdev-mx-auto wpdev-my-10 wpdev-p-12 wpdev-bg-white wpdev-shadow wpdev-text-justify">

    <p class="wpdev-text-lg wpdev-leading-relaxed">
      A new release strategy
    </p>

    <h1 class="wpdev-text-3xl">
      Here's <span class="wpdev-font-bold">Erasmo</span>:<br>
      WPDev version 2.3.0
    </h1>

    <p class="wpdev-text-lg wpdev-leading-relaxed">
      Hi guys!
    </p>

    <p class="wpdev-text-lg wpdev-leading-relaxed">
      With WPDev 2.3.0 we start a new streamlined approach of releases, focusing on a central feature in minors and rolling out fixes as soon as they are ready in patches. Less time waiting and leaner versions.
    </p>
    <p class="wpdev-text-lg wpdev-leading-relaxed">
      This way we intend to avoid a significant gap in time between updates and an extensive scope of changes and fixes, all bundled into one massive release.
    </p>
    <p class="wpdev-text-lg wpdev-leading-relaxed">
      This version focuses on allowing custom meta fields for customers in the admin area. This tool lets you collect additional information from your users. The potential for automation and WPDev customizations is now expanded, as these fields may help tailor and streamline your operations.
    </p>
    <p class="wpdev-text-lg wpdev-leading-relaxed">
      We also added a bunch of improvements and fixes that go from more translated strings for Spanish, Brazilian Portuguese, and French, to better PHP 8.2 compatibility, to webhook triggering.
    </p>
    <div class="wpdev-inline-block wpdev-float-right wpdev-ml-8 wpdev-mb-4">
      <img class="wpdev-block wpdev-rounded" src="<?php echo wpdev_get_asset('erasmo-carlos.jpg'); ?>" width="200">
      <small class="wpdev-block wpdev-mt-1">Gilberto Gil</small>
    </div>
    <p class="wpdev-text-lg wpdev-leading-relaxed">
      This version is called Erasmo in honor of the Brazilian singer and songwriter
      <a href="https://en.wikipedia.org/wiki/Erasmo_Carlos" target="_blank">
        Erasmo Carlos
      </a>
      , who left us in 2022, at the age of 81.
    </p>
    <p class="wpdev-text-lg wpdev-leading-relaxed">
      Erasmo was one of the faces of Jovem Guarda, a Brazilian musical TV show aired during the 1960’s. The show was highly influenced by American rock’n roll and the British Invasion of rock bands of that decade.
    </p>
    <p class="wpdev-text-lg wpdev-leading-relaxed">
      Erasmo's songs are about love, friendship, ecology, and many other subjects distributed along more than two dozen albums. Here, you can listen to one of his classic songs
      <a href="https://www.youtube.com/watch?v=ICnivS25bDc" target="_blank">Minha fama de mau</a>.
      If you’re feeling more romantic, go for this version of
      <a href="https://www.youtube.com/watch?v=I5KJyKsLNGk" target="_blank">Do fundo do meu coração</a>,
      with Adriana Calcanhoto. And don’t forget to check out this
      <a href="https://open.spotify.com/playlist/37i9dQZF1DZ06evO3F0tyd?si=6bb306446698495f" target="_blank">awesome playlist</a>.
    </p>
    <p class="wpdev-text-lg wpdev-leading-relaxed">
      As always, let me know if you have any questions.
    </p>
    <p class="wpdev-text-lg wpdev-leading-relaxed wpdev-mb-8">
      Yours truly,
    </p>

    <p class="wpdev-text-lg wpdev-leading-relaxed wpdev-mb-0">

      <?php echo get_avatar('arindo@wpdev.ir', 64, '', 'Arindo Duque', [
          'class' => 'wpdev-rounded-full',
      ]); ?>

      <strong class="wpdev-block">Arindo Duque</strong>
      <small class="wpdev-block">Founder and CEO of WPDev, the makers of WPDev</small>
    </p>

  </div>

  <div style="max-width: 700px;" class="wpdev-max-w-screen-md wpdev-mx-auto wpdev-mb-10">

    <hr class="hr-text wpdev-my-4 wpdev-text-gray-800" data-content="THIS VERSION WAS CRAFTED WITH LOVE BY">

    <?php

    $key_people = [
        'arindo' => [
            'email' => 'arindo@wpdev.ir',
            'signature' => 'arindo.png',
            'name' => 'Arindo Duque',
            'position' => 'Founder and CEO',
        ],
        'allyson' => [
            'email' => 'allyson@wpdev.ir',
            'signature' => '',
            'name' => 'Allyson Souza',
            'position' => 'Developer',
        ],
        'anyssa' => [
            'email' => 'anyssa@wpdev.ir',
            'signature' => '',
            'name' => 'Anyssa Ferreira',
            'position' => 'Designer',
        ],
        'gustavo' => [
            'email' => 'gustavo@wpdev.ir',
            'signature' => '',
            'name' => 'Gustavo Modesto',
            'position' => 'Developer',
        ],
        'juliana' => [
            'email' => 'juliana@wpdev.ir',
            'signature' => '',
            'name' => 'Juliana Dias Gomes',
            'position' => 'Do-it-all',
        ],
        'lucas-carvalho' => [
            'email' => 'lucas@wpdev.ir',
            'signature' => '',
            'name' => 'Lucas Carvalho',
            'position' => 'Developer',
        ],
        'yan' => [
            'email' => 'yan@wpdev.ir',
            'signature' => '',
            'name' => 'Yan Kairalla',
            'position' => 'Developer',
        ],
    ];

?>

    <div class="wpdev-flex wpdev-flex-wrap wpdev-mt-8">

      <?php foreach ($key_people as $person) { ?>

        <div class="wpdev-text-center wpdev-w-1/4 wpdev-mb-5">

          <?php
      echo get_avatar($person['email'], 64, '', 'Arindo Duque', [
          'class' => 'wpdev-rounded-full',
      ]);
          ?>
          <strong class="wpdev-text-base wpdev-block"><?php echo $person['name']; ?></strong>
          <small class="wpdev-text-xs wpdev-block"><?php echo $person['position']; ?></small>

        </div>

      <?php } ?>

    </div>

  </div>

</div>

<style>
.hr-text {
  line-height: 1em;
  position: relative;
  outline: 0;
  border: 0;
  /* color: black; */
  text-align: center;
  height: 1.5em;
  opacity: .5;
}
.hr-text:before {
  content: '';
  background: -webkit-gradient(linear, left top, right top, from(transparent), color-stop(#818078), to(transparent));
  background: linear-gradient(to right, transparent, #818078, transparent);
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  height: 1px;
}
.hr-text:after {
  content: attr(data-content);
  position: relative;
  display: inline-block;
  /* color: black; */
  padding: 0 .5em;
  line-height: 1.5em;
  color: #818078;
  background-color: #eef2f5;
}
</style>
