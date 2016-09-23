package main

import (
	"fmt"
	log "github.com/Sirupsen/logrus"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx"
	"github.com/pborman/uuid"
	"net/http"
	"os"
	"strings"
	"time"
)

var Stage = os.Getenv("STAGE")

type Event struct {
	Id        string
	SleepType string
	Timezone  string
	StartAt   time.Time
	EndAt     time.Time
	Duration  time.Duration
}

type Timestamp struct {
	Wday string `json:"wday"`
	Date string `json:"date"`
	Time string `json:"time"`
}

type UIEvent struct {
	Id           string    `json:"event_id"`
	SleepType    string    `json:"sleep_type"`
	Timezone     string    `json:"timezone"`
	LocalStartAt Timestamp `json:"local_start_at"`
	LocalEndAt   Timestamp `json:"local_end_at"`
	Duration     string    `json:"utc_duration"`
}

func main() {
	log.Info("Connecting to PostgreSQL")
	pool, err := pgx.NewConnPool(pgx.ConnPoolConfig{
		ConnConfig: pgx.ConnConfig{
			Host:     "localhost",
			Port:     5432,
			Database: "vagrant",
			User:     "vagrant",
			Password: "",
		},
		MaxConnections: 2,
		AcquireTimeout: 2 * time.Second,
	})
	if err != nil {
		log.Fatal("Failed to connect to PostgreSQL")
		panic("Failed to open connection to PostgreSQL")
	}

	r := gin.Default()
	r.Static("/assets", "./assets")
	r.LoadHTMLGlob("views/*")

	r.GET("/", func(c *gin.Context) {
		log.Info("Rendering")
		if Stage == "production" {
			c.Header("Cache-Control", "public; max-age=3600")
		}

		c.HTML(http.StatusOK, "home.tmpl", gin.H{
			"HumanStage": Stage,
		})
	})

	r.POST("/", func(c *gin.Context) {
		log.Info("Registering new user")
		user_id := uuid.New()
		c.Redirect(http.StatusFound, "/me/"+user_id)
	})

	r.GET("/me/:user_id", func(c *gin.Context) {
		userId := uuid.Parse(c.Param("user_id"))
		tableName := "events_" + strings.Replace(userId.String(), "-", "_", -1)

		log.WithFields(log.Fields{
			"user_id":               userId,
			"connection_pool_stats": pool.Stat(),
		}).Info("Rendering app")

		rows, err := pool.Query("SELECT event_id, sleep_type, timezone, start_at, end_at, extract(epoch FROM date_trunc('minute', end_at - start_at)) AS utc_seconds FROM " + tableName + " ORDER BY start_at DESC LIMIT 5")
		if err != nil {
			log.WithFields(log.Fields{
				"err": err,
			}).Warn("Error after parsing rows")

			c.HTML(http.StatusBadRequest, "bad_user_id.tmpl", gin.H{
				"UserId":     userId,
				"HumanStage": Stage,
			})
		} else {
			defer rows.Close()

			var events []Event

			for rows.Next() {
				var id string
				var sleepType string
				var timezone string
				var startAt time.Time
				var endAt time.Time
				var duration float64
				rows.Scan(&id, &sleepType, &timezone, &startAt, &endAt, &duration)

				var newDuration time.Duration
				newDuration, err = time.ParseDuration(fmt.Sprintf("%fs", duration))
				if err != nil {
					log.WithFields(log.Fields{
						"err":      err,
						"duration": duration,
					}).Warn("Error parsing duration")

					c.HTML(http.StatusInternalServerError, "internal_server_error.tmpl", gin.H{
						"UserId":     userId,
						"HumanStage": Stage,
					})
				} else {
					event := Event{
						Id:        id,
						SleepType: sleepType,
						Timezone:  timezone,
						StartAt:   startAt,
						EndAt:     endAt,
						Duration:  newDuration,
					}

					events = append(events, event)
				}
			}

			if rows.Err() != nil {
				log.WithFields(log.Fields{
					"err": rows.Err(),
				}).Warn("Error after parsing rows")

				c.HTML(http.StatusBadRequest, "bad_user_id.tmpl", gin.H{
					"UserId":     userId,
					"HumanStage": Stage,
				})
			} else {
				log.WithFields(log.Fields{
					"events": events,
				}).Warn("Marshalled events")

				var uiEvents []UIEvent
				for _, event := range events {
					location, err := time.LoadLocation(event.Timezone)
					if err != nil {
						c.HTML(http.StatusInternalServerError, "internal_server_error.tmpl", gin.H{
							"UserId":     userId,
							"HumanStage": Stage,
						})
					} else {
						localStartAt := event.StartAt.In(location)
						localEndAt := event.EndAt.In(location)
						durationInSeconds := event.Duration.Seconds()
						hours := int(durationInSeconds / 3600)
						minutes := int((durationInSeconds - float64(hours*3600)) / 60)

						uiEvents = append(uiEvents, UIEvent{
							Id:        event.Id,
							SleepType: event.SleepType,
							Timezone:  event.Timezone,
							LocalStartAt: Timestamp{
								Wday: localStartAt.Format("Mon"),
								Date: localStartAt.Format("2006-01-02"),
								Time: localStartAt.Format("15:04"),
							},
							LocalEndAt: Timestamp{
								Wday: localEndAt.Format("Mon"),
								Date: localEndAt.Format("2006-01-02"),
								Time: localEndAt.Format("15:04"),
							},
							Duration: fmt.Sprintf("%dh %02dm", hours, minutes),
						})
					}
				}

				c.HTML(http.StatusOK, "app.tmpl", gin.H{
					"UserId":     userId,
					"HumanStage": Stage,
					"Events":     uiEvents,
				})
			}
		}
	})

	r.Run() // listen and server on 0.0.0.0:8080
}
