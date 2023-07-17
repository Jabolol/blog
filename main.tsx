/** @jsx h */

import blog, { h } from "blog";
import "lua";
import "bash";
import "typescript";
import "powershell";
import "json";
import "yaml";
import "jsx";
import "makefile";

blog({
  title: "Javi's Blog",
  description: "An opinionated view on diverse topics.",
  avatar: "./dino.svg",
  avatarClass: "rounded-full",
  author: "Javier Ríos",
  theme: "auto",
  lang: "en",
  links: [{
    title: "GitHub",
    url: "https://github.com/Jabolol",
    target: "_blank",
  }, {
    title: "Email",
    url: "mailto:javier.rios-urbano@epitech.eu",
    target: "_blank",
  }, {
    title: "LinkedIn",
    url: "https://www.linkedin.com/in/javierriosur/",
    target: "_blank",
  }, {
    title: "Discord",
    url: "https://discord.com/users/688471059887947917",
    target: "_blank",
  }],
  favicon: "./dino.svg",
});
