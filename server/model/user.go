package model

import (
	"next-terminal/server/common"
)

type User struct {
	ID         string `gorm:"primary_key,type:varchar(36)" json:"id"`
	Username   string `gorm:"index,type:varchar(200)" json:"username"`
	Password   string `gorm:"type:varchar(500)" json:"password"`
	Nickname   string `gorm:"type:varchar(500)" json:"nickname"`
	TOTPSecret string `json:"-"`
	// ForceTotp 表示管理员强制要求该账户开启双因素认证。
	// 为 true 且 TOTPSecret 为空时，用户登录后必须完成绑定才能使用系统。
	ForceTotp   bool            `gorm:"column:force_totp" json:"forceTotp"`
	EnabledTotp bool            `gorm:"-" json:"enabledTotp"`
	Online      *bool           `json:"online"`
	Status      string          `gorm:"type:varchar(10)" json:"status"`
	Created     common.JsonTime `json:"created"`
	Type        string          `gorm:"type:varchar(20)" json:"type"`
	Mail        string          `gorm:"type:varchar(500)" json:"mail"`
	Source      string          `gorm:"type:varchar(20)" json:"source"`
	Roles       []string        `gorm:"-" json:"roles"`
}

type UserForPage struct {
	ID         string `json:"id"`
	Username   string `json:"username"`
	Nickname   string `json:"nickname"`
	TOTPSecret string `json:"-"`
	// ForceTotp 管理员是否强制该账户开启双因素认证
	ForceTotp bool `json:"forceTotp"`
	// EnabledTotp 是否已绑定双因素认证（由 TOTPSecret 推导，仅用于展示）
	EnabledTotp      bool            `gorm:"-" json:"enabledTotp"`
	Mail             string          `json:"mail"`
	Online           bool            `json:"online"`
	Status           string          `json:"status"`
	Created          common.JsonTime `json:"created"`
	Type             string          `json:"type"`
	Source           string          `json:"source"`
	SharerAssetCount int64           `json:"sharerAssetCount"`
}

func (r *User) TableName() string {
	return "users"
}
