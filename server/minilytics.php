<?php

namespace Minilytics;

use \Exception;
use \PDO;

use App\HttpException;
use App\Validator;
use App\ActiveRecord;
use App\Result;
use App\Helpers;
use App\Migration;

$app->post('minilytics-visit', function () use ($app) {
	$json = json_decode($app->getBody());

	if (
		!isset($json->siteId)
		|| !isset($json->path)
		|| !isset($json->unique)
		|| !isset($json->touch)
		|| !isset($json->deviceWidth)
		|| !isset($json->deviceHeight)
	) {
		throw new HttpException('Bad request, one or more parameters are missing.', 400);
	}

	foreach ($json as $key => $value) {
		if (!is_string($value)) continue;
		if (!trim($value)) throw new HttpException('Bad request, one or more parameters are empty.', 400);
	}

	$config = $app->getValue('minilyticsConfig');
	$siteIds = $config->getSiteIds();

	$validator = new Validator();
	$visit = new Visit();
	$visit->useConstraints($validator, ['site_ids' => $siteIds]);

	$visit->siteId = $json->siteId;
	$visit->path = $json->path;
	$visit->unique = $json->unique;
	$visit->referrer = $json->referrer ?? null;
	$visit->timezone = $json->timezone;
	$visit->browserName = $json->browserName;
	$visit->browserVersion = $json->browserVersion;
	$visit->touch = $json->touch;
	$visit->deviceWidth = $json->deviceWidth;
	$visit->deviceHeight = $json->deviceHeight;
	$visit->utmSource = $json->utm->source ?? null;
	$visit->utmMedium = $json->utm->medium ?? null;
	$visit->utmCampaign = $json->utm->campaign ?? null;
	$visit->utmTerm = $json->utm->term ?? null;
	$visit->utmContent = $json->utm->content ?? null;
	$visit->guid = generateGloballyUniqueIdentifier();
	$saved = $visit->save();

	if (!$saved) {
		return Result::generateArray(
			RESULT::INVALID,
			'Bad request, one or more parameters are invalid.',
			$visit->getErrors(),
		);
	}

	return [
		'guid' => $visit->guid,
	];
});

$app->get('test', function () use ($app) {
	$visit = Visit::findOne('guid', '55083615-F396-49CA-A851-23BBF5B4ED6E');
	$visit->utmTerm = 0;
	$visit->save();
});

$app->post('minilytics-visit-update', function () use ($app) {
	$json = json_decode($app->getBody());

	if (
		!isset($json->siteId)
		|| !isset($json->guid)
		|| !isset($json->duration)
	) {
		throw new HttpException('Bad request, one or more parameters are missing.', 400);
	}

	$visit = Visit::findOne('guid', $json->guid);
	$visit->duration = $json->duration;
	$saved = $visit->save();

	if (!$saved) {
		return Result::generateArray(
			RESULT::ERROR,
			'Bad request.',
			$visit->getErrors(),
		);
	}

	return Result::generateArray();
});

$app->post('minilytics-event', function () use ($app) {
	$json = json_decode($app->getBody());

	if (
		!isset($json->siteId)
		|| !isset($json->event)
	) {
		throw new HttpException('Bad request, one or more parameters are missing.', 400);
	}

	$validator = new Validator();
	$event = new Event();
	$event->useConstraints($validator);

	$event->siteId = $json->siteId;
	$event->type = $json->event;
	$event->context = isset($json->context) ? json_encode($json->context) : null;
	$saved = $event->save();

	if (!$saved) {
		return Result::generateArray(
			RESULT::INVALID,
			'Bad request, one or more parameters are invalid.',
			$event->getErrors(),
		);
	}

	return Result::generateArray();
});

$app->get('minilytics-admin', function () use ($app) {
	if (!$app->getValue('minilyticsConfig')) throw new Exception('Minilytics Config missing.');

	$config = $app->getValue('minilyticsConfig');
	$sites = $config->getSites();
	$migration = new Migration('.migrations_minilytics');

	$migration->run(
		function (PDO $db) {
			$queryVisits = 'CREATE TABLE `visits` (
				`id`              BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
				`guid`            CHAR(36) NOT NULL,
				`site_id`         VARCHAR(128) NOT NULL,
				`path`            VARCHAR(1024) NOT NULL,
				`unique`          BIT NOT NULL,
				`referrer`        TEXT NULL,
				`timezone`        TEXT NULL,
				`browser_name`    VARCHAR(64) NOT NULL,
				`browser_version` INT(5) UNSIGNED NOT NULL,
				`touch`           BIT NOT NULL,
				`device_width`    INT(5) UNSIGNED NOT NULL,
				`device_height`   INT(5) UNSIGNED NOT NULL,
				`utm_source`      VARCHAR(255) NULL,
				`utm_medium`      VARCHAR(255) NULL,
				`utm_campaign`    VARCHAR(255) NULL,
				`utm_term`        VARCHAR(255) NULL,
				`utm_content`     VARCHAR(255) NULL,
				`duration`        MEDIUMINT UNSIGNED NULL,
				`timestamp`       TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
			) CHARACTER SET utf8 COLLATE utf8_general_ci';

			$queryEvents = 'CREATE TABLE `events` (
				`id`        BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
				`site_id`   VARCHAR(128) NOT NULL,
				`type`      VARCHAR(128) NOT NULL,
				`context`   TEXT NULL,
				`timestamp` TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
			) CHARACTER SET utf8 COLLATE utf8_general_ci';

			$db->exec($queryVisits);
			$db->exec($queryEvents);
		},
	);

	// @todo only run migration when not runned
	// @todo Read and show data
	// @todo Entry Page -> PHP (unique = true)
	// @todo Engagement -> Time on page > 10 seconds -> PHP
	// @todo Page views in the last minute -> PHP
	// @todo Exit page => wenn keine Duration
});

class Visit extends ActiveRecord {

	protected string $table = 'visits';

	protected array $fields = [
		'site_id' => 'siteId',
		'guid',
		'path',
		'unique',
		'referrer',
		'timezone',
		'browser_name' => 'browserName',
		'browser_version' => 'browserVersion',
		'touch',
		'device_width' => 'deviceWidth',
		'device_height' => 'deviceHeight',
		'utm_source' => 'utmSource',
		'utm_medium' => 'utmMedium',
		'utm_campaign' => 'utmCampaign',
		'utm_term' => 'utmTerm',
		'utm_content' => 'utmContent',
		'duration',
		'timestamp',
	];

	protected function constraints(Validator $validator, ?array $context = null) {
		if (isset($context['site_ids'])) {
			$validator->field($this->getFormFieldName('site_id'), $this->siteId)->required()->inList(...$context['site_ids']);
		} else {
			$validator->field($this->getFormFieldName('site_id'), $this->siteId)->required();
		}

		$validator->field($this->getFormFieldName('guid'), $this->path)->required();
		$validator->field($this->getFormFieldName('path'), $this->path)->required();
		$validator->field($this->getFormFieldName('unique'), $this->unique)->required()->boolean();
		$validator->field($this->getFormFieldName('referrer'), $this->referrer)->domain();
		$validator->field($this->getFormFieldName('touch'), $this->touch)->boolean();
		$validator->field($this->getFormFieldName('device_width'), $this->deviceWidth)->required()->number();
		$validator->field($this->getFormFieldName('device_height'), $this->deviceHeight)->required()->number();
		$validator->field($this->getFormFieldName('duration'), $this->duration)->number();
	}

}


class Event extends ActiveRecord {

	protected string $table = 'events';

	protected array $fields = [
		'site_id' => 'siteId',
		'type',
		'context',
		'timestamp',
	];

	protected function constraints(Validator $validator, ?array $context = null) {
		$validator->field($this->getFormFieldName('site_id'), $this->siteId)->required();
		$validator->field($this->getFormFieldName('type'), $this->type)->required();
	}

}

class Config {

	private array $sites = [];

	public function addSite(Site $site) {
		$this->sites[] = $site;
	}

	public function getSites(): array {
		return $this->sites;
	}

	public function getSiteIds(): array {
		return array_column($this->sites, 'id');
	}

}

class Site {

	public string $id;
	public string $name;
	public string $domain;
	public array $users;

	public function __construct(string $id, string $name, string $domainName, array $users) {
		$this->id = $id;
		$this->name = $name;
		$this->domain = $domainName;
		$this->users = $users;
	}

}

function generateGloballyUniqueIdentifier() {
	if (function_exists('com_create_guid') === true) {
		return trim(com_create_guid(), '{}');
	}

	return sprintf('%04X%04X-%04X-%04X-%04X-%04X%04X%04X', mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(16384, 20479), mt_rand(32768, 49151), mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(0, 65535));
}
