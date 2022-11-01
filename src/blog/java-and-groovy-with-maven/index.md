---
id: java-and-groovy-with-maven
title: Java and Groovy with Maven
tagline: Compiling Groovy classes in a Java Maven project.
date: 2022-11-01
imageSocialGeneric: true
categories:
  - Web Development
tags:
  - web
  - development
  - java
  - groovy
  - maven
  - build
---

I recently migrated a Groovy application to Java. But there were some Groovy classes that used some of Groovy's Map extensions and I didn't want to lose that comfort.

The project is build with Maven and while everything worked well when I stared the project form IntelliJ it did not build with Maven.

My coworker pointed out that IntelliJ probably compiles the Groovy classes with the Groovy compiler. He also told me that IntelliJ is able to convert Groovy classes to Java classes. I tried it but the result had errors and was not really readable.

So i looked up how Maven can compile my Groovy classes when I build the project. There are [some options and a few plugins](https://www.baeldung.com/groovy-java-applications) that can do it. In the end I used GMaven+ plugin. I made the following changes in my "pom.xml":

* Add "org.codehaus.groovy.groovy-all" (2.5.8) to dependencies
* Add "scriptSourceDirectory" with path to Groovy files to "build"
* Add "sourceDirectory" with path to Java files to "build"
* Add plugin "org.codehaus.gmavenplus.gmavenplus-plugin" (1.13.1) to build plugins

After these changes Maven was able to build my project.

```XML
<project>
	...

	<properties>
		<groovyVersion>2.5.8</groovyVersion>
	</properties>

	<dependencies>
		...
		<dependency>
			<groupId>org.codehaus.groovy</groupId>
			<artifactoryId>groovy-all</artifactoryId>
			<version>${groovyVersion}</version>
			<type>pom</type>
		</dependency>
	</dependencies>

	<build>
		<scriptSourceDirectory>src/main/groovy</scriptSourceDirectory>
		<sourceDirectory>src/main/java</sourceDirectory>
		<plugins>
			<plugin>
				<groupId>org.codehaus.gmavenplus</groupId>
				<artifactoryId>gmavenplus-plugin</artifactoryId>
				<version>1.13.1</version>
				<executions>
					<execution>
						<goals>
							<goal>execute</goal>
							<goal>addSources</goal>
							<goal>addTestSources</goal>
							<goal>generateStubs</goal>
							<goal>compile</goal>
							<goal>generateTestStubs</goal>
							<goal>compileTests</goal>
							<goal>removeStubs</goal>
							<goal>removeTestStubs</goal>
						</goals>
					</execution>
				</executions>
				<dependencies>
					<dependency>
						<groupId>org.codehaus.groovy</groupId>
						<artifactoryId>groovy-all</artifactoryId>
						<version>${groovyVersion}</version>
						<scope>runtime</scope>
						<type>pom</type>
					</dependency>
				</dependencies>
			</plugin>
			...
		</plugins>
		...
	</build>
</project>
```
